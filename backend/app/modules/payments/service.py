"""
Payment service.

Flow for the static-QR method:
  customer uploads a proof image  ->  admin verifies or rejects.

Verifying a payment auto-confirms a still-pending order (pending -> confirmed),
which is the trigger point the order lifecycle expects. COD orders are confirmed
by the admin directly through the orders status endpoint instead.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import NotFoundError, ValidationError
from app.core.storage import get_storage
from app.modules.customers.models import Customer
from app.modules.orders.models import Order
from app.modules.payments.models import Payment, PaymentProof
from app.shared.enums import OrderStatus, PaymentStatus


class PaymentService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _get_with_proofs(self, payment_id: uuid.UUID) -> Payment:
        payment = self.db.execute(
            select(Payment).options(selectinload(Payment.proofs)).where(Payment.id == payment_id)
        ).scalar_one_or_none()
        if payment is None:
            raise NotFoundError("Payment not found.")
        return payment

    def get_by_order(self, order_id: uuid.UUID) -> Payment:
        payment = self.db.execute(
            select(Payment).options(selectinload(Payment.proofs)).where(Payment.order_id == order_id)
        ).scalar_one_or_none()
        if payment is None:
            raise NotFoundError("No payment for that order.")
        return payment

    def upload_proof(self, *, order_id: uuid.UUID, customer: Customer, file_bytes: bytes, filename: str, content_type: str) -> Payment:
        order = self.db.execute(select(Order).where(Order.id == order_id)).scalar_one_or_none()
        if order is None or order.customer_id != customer.id:
            raise NotFoundError("Order not found.")

        payment = self.get_by_order(order_id)
        if payment.status == PaymentStatus.VERIFIED:
            raise ValidationError("Payment is already verified.")

        stored = get_storage().save(
            file_bytes=file_bytes, filename=filename, content_type=content_type, folder="payment_proofs"
        )
        self.db.add(PaymentProof(payment_id=payment.id, storage_key=stored.key))
        # A fresh proof after a rejection moves the payment back to pending review.
        payment.status = PaymentStatus.PENDING
        payment.rejection_reason = None
        self.db.commit()
        # Expire so the proofs collection reloads (it was selectin-loaded as empty
        # before this proof was added, and would otherwise be returned stale).
        self.db.expire(payment)
        return self._get_with_proofs(payment.id)

    def verify(self, *, payment_id: uuid.UUID, admin_user_id: uuid.UUID) -> Payment:
        payment = self._get_with_proofs(payment_id)
        payment.status = PaymentStatus.VERIFIED
        payment.verified_by = admin_user_id
        payment.verified_at = datetime.now(timezone.utc)

        # Auto-confirm a still-pending order once its payment clears.
        order = self.db.execute(select(Order).where(Order.id == payment.order_id)).scalar_one()
        if order.status == OrderStatus.PENDING:
            from app.modules.orders.models import OrderStatusHistory

            self.db.add(
                OrderStatusHistory(
                    order_id=order.id, from_status=order.status, to_status=OrderStatus.CONFIRMED, changed_by=admin_user_id
                )
            )
            order.status = OrderStatus.CONFIRMED

        self.db.commit()
        return self._get_with_proofs(payment_id)

    def reject(self, *, payment_id: uuid.UUID, admin_user_id: uuid.UUID, reason: str) -> Payment:
        payment = self._get_with_proofs(payment_id)
        payment.status = PaymentStatus.REJECTED
        payment.verified_by = admin_user_id
        payment.verified_at = datetime.now(timezone.utc)
        payment.rejection_reason = reason
        self.db.commit()
        return self._get_with_proofs(payment_id)

    def list_pending(self) -> list[Payment]:
        stmt = (
            select(Payment)
            .options(selectinload(Payment.proofs))
            .where(Payment.status == PaymentStatus.PENDING)
            .order_by(Payment.created_at)
        )
        return list(self.db.execute(stmt).scalars())
