"""
Idempotent seed script: creates the two roles and a bootstrap admin user.

Run once after migrations:
    python -m scripts.seed_initial_data

Admin credentials come from env (SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD),
defaulting to admin / ChangeMe123! — change immediately after first login.
"""
import os

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.modules.users.models import Role, User
from app.shared.enums import RoleName
from app.shared.models import registry  # noqa: F401  (register all mappers)


def seed() -> None:
    db = SessionLocal()
    try:
        # Roles
        existing = {r.name for r in db.query(Role).all()}
        for role_name in (RoleName.ADMIN.value, RoleName.CUSTOMER.value):
            if role_name not in existing:
                db.add(Role(name=role_name))
        db.commit()

        # Bootstrap admin
        admin_username = os.environ.get("SEED_ADMIN_USERNAME", "admin")
        admin_password = os.environ.get("SEED_ADMIN_PASSWORD", "ChangeMe123!")
        if db.query(User).filter_by(username=admin_username).first() is None:
            admin_role = db.query(Role).filter_by(name=RoleName.ADMIN.value).one()
            db.add(
                User(
                    username=admin_username,
                    password_hash=hash_password(admin_password),
                    role_id=admin_role.id,
                )
            )
            db.commit()
            print(f"Created admin user '{admin_username}'.")
        else:
            print(f"Admin user '{admin_username}' already exists — skipping.")

        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
