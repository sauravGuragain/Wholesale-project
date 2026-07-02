import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.modules.offers.schemas import OfferCreate, OfferOut, OfferUpdate
from app.modules.offers.service import OfferService
from app.shared.enums import RoleName
from app.shared.schemas.base import MessageResponse

router = APIRouter(prefix=f"{settings.API_V1_PREFIX}/offers", tags=["offers"])
admin_dep = Depends(require_role(RoleName.ADMIN))


@router.get("", response_model=list[OfferOut])
def list_offers(active_only: bool = True, _=Depends(get_current_user), db: Session = Depends(get_db)) -> list[OfferOut]:
    # Customers see only currently-active offers; admins can pass active_only=false.
    return [OfferOut.model_validate(o) for o in OfferService(db).list(active_only=active_only)]


@router.post("", response_model=OfferOut, status_code=201, dependencies=[admin_dep])
def create_offer(payload: OfferCreate, db: Session = Depends(get_db)) -> OfferOut:
    return OfferOut.model_validate(OfferService(db).create(payload))


@router.patch("/{offer_id}", response_model=OfferOut, dependencies=[admin_dep])
def update_offer(offer_id: uuid.UUID, payload: OfferUpdate, db: Session = Depends(get_db)) -> OfferOut:
    return OfferOut.model_validate(OfferService(db).update(offer_id, payload))


@router.delete("/{offer_id}", response_model=MessageResponse, dependencies=[admin_dep])
def delete_offer(offer_id: uuid.UUID, db: Session = Depends(get_db)) -> MessageResponse:
    OfferService(db).delete(offer_id)
    return MessageResponse(detail="Offer deleted.")
