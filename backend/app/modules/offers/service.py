"""Offer management with validity-window helpers."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationError
from app.modules.offers.models import Offer
from app.modules.offers.schemas import OfferCreate, OfferUpdate
from app.shared.enums import OfferAppliesTo


class OfferService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, payload: OfferCreate) -> Offer:
        if payload.applies_to != OfferAppliesTo.ORDER and payload.target_id is None:
            raise ValidationError("target_id is required when the offer applies to a product or category.")
        if payload.starts_at and payload.ends_at and payload.ends_at <= payload.starts_at:
            raise ValidationError("ends_at must be after starts_at.")
        offer = Offer(**payload.model_dump())
        self.db.add(offer)
        self.db.commit()
        self.db.refresh(offer)
        return offer

    def update(self, offer_id: uuid.UUID, payload: OfferUpdate) -> Offer:
        offer = self.db.get(Offer, offer_id)
        if offer is None:
            raise NotFoundError("Offer not found.")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(offer, field, value)
        self.db.commit()
        self.db.refresh(offer)
        return offer

    def delete(self, offer_id: uuid.UUID) -> None:
        offer = self.db.get(Offer, offer_id)
        if offer is None:
            raise NotFoundError("Offer not found.")
        self.db.delete(offer)
        self.db.commit()

    def list(self, *, active_only: bool) -> list[Offer]:
        stmt = select(Offer).order_by(Offer.created_at.desc())
        if active_only:
            now = datetime.now(timezone.utc)
            stmt = stmt.where(Offer.is_active.is_(True))
            # Window filtering done in Python to keep the query DB-portable for tests.
            offers = [
                o
                for o in self.db.execute(stmt).scalars()
                if (o.starts_at is None or o.starts_at <= now) and (o.ends_at is None or o.ends_at >= now)
            ]
            return offers
        return list(self.db.execute(stmt).scalars())
