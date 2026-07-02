import uuid

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.storage import get_storage
from app.modules.customers.dependencies import get_current_customer
from app.modules.customers.models import Customer
from app.modules.payments.models import Payment
from app.modules.payments.schemas import PaymentOut, PaymentProofOut, RejectPaymentInput
from app.modules.payments.service import PaymentService
from app.modules.users.models import User
from app.shared.enums import RoleName
from app.shared.utils.file_upload import read_validated_image

router = APIRouter(prefix=f"{settings.API_V1_PREFIX}/payments", tags=["payments"])


def _to_payment_out(payment: Payment) -> PaymentOut:
    storage = get_storage()
    return PaymentOut(
        id=payment.id,
        order_id=payment.order_id,
        method=payment.method,
        amount=payment.amount,
        status=payment.status,
        verified_at=payment.verified_at,
        rejection_reason=payment.rejection_reason,
        proofs=[
            PaymentProofOut(id=p.id, url=storage.url_for(p.storage_key), created_at=p.created_at) for p in payment.proofs
        ],
    )


# --- Customer: upload payment proof for the static-QR method ---

@router.post("/{order_id}/proof", response_model=PaymentOut, status_code=201)
async def upload_proof(
    order_id: uuid.UUID,
    file: UploadFile = File(...),
    customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
) -> PaymentOut:
    file_bytes, filename, content_type = await read_validated_image(file)
    payment = PaymentService(db).upload_proof(
        order_id=order_id, customer=customer, file_bytes=file_bytes, filename=filename, content_type=content_type
    )
    return _to_payment_out(payment)


@router.get("/order/{order_id}", response_model=PaymentOut)
def get_payment_for_order(
    order_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> PaymentOut:
    payment = PaymentService(db).get_by_order(order_id)
    # Customers can only see their own order's payment.
    if current_user.role.name == RoleName.CUSTOMER.value:
        customer = current_user.customer_profile
        from app.modules.orders.models import Order
        from sqlalchemy import select

        order = db.execute(select(Order).where(Order.id == order_id)).scalar_one_or_none()
        if customer is None or order is None or order.customer_id != customer.id:
            from app.core.exceptions import NotFoundError

            raise NotFoundError("Order not found.")
    return _to_payment_out(payment)


# --- Admin: verification queue ---

@router.get("/pending", response_model=list[PaymentOut], dependencies=[Depends(require_role(RoleName.ADMIN))])
def list_pending(db: Session = Depends(get_db)) -> list[PaymentOut]:
    return [_to_payment_out(p) for p in PaymentService(db).list_pending()]


@router.patch("/{payment_id}/verify", response_model=PaymentOut, dependencies=[Depends(require_role(RoleName.ADMIN))])
def verify_payment(
    payment_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> PaymentOut:
    return _to_payment_out(PaymentService(db).verify(payment_id=payment_id, admin_user_id=current_user.id))


@router.patch("/{payment_id}/reject", response_model=PaymentOut, dependencies=[Depends(require_role(RoleName.ADMIN))])
def reject_payment(
    payment_id: uuid.UUID,
    payload: RejectPaymentInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentOut:
    return _to_payment_out(
        PaymentService(db).reject(payment_id=payment_id, admin_user_id=current_user.id, reason=payload.reason)
    )
