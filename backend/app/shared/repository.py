"""
Generic repository base class.

Each module's repository.py subclasses this for the common CRUD path and
adds module-specific query methods (e.g. search, filters) on top. Keeps
routers/services free of raw SQLAlchemy Query objects.
"""
import uuid
from typing import Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.shared.models.base import Base, SoftDeleteMixin

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    model: type[ModelT]

    def __init__(self, db: Session) -> None:
        self.db = db

    def _base_query(self):
        stmt = select(self.model)
        if issubclass(self.model, SoftDeleteMixin):
            stmt = stmt.where(self.model.deleted_at.is_(None))  # type: ignore[attr-defined]
        return stmt

    def get_by_id(self, id_: uuid.UUID) -> ModelT | None:
        return self.db.execute(self._base_query().where(self.model.id == id_)).scalar_one_or_none()

    def add(self, instance: ModelT) -> ModelT:
        self.db.add(instance)
        self.db.flush()  # populate server-generated defaults (id, created_at) without committing
        return instance

    def delete(self, instance: ModelT) -> None:
        if isinstance(instance, SoftDeleteMixin):
            from datetime import datetime, timezone

            instance.deleted_at = datetime.now(timezone.utc)
            self.db.flush()
        else:
            self.db.delete(instance)
            self.db.flush()

    def paginate(self, stmt, *, page: int, page_size: int) -> tuple[list[ModelT], int]:
        from sqlalchemy import func

        total = self.db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
        items = self.db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
        return list(items), total
