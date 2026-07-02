"""
Imports every model module so that:
  * SQLAlchemy can resolve string-based relationship() references across modules
  * Alembic autogenerate sees the complete metadata

Import this module (not individual model modules) anywhere the full schema is needed.
"""
from app.modules.categories import models as categories_models  # noqa: F401
from app.modules.customers import models as customers_models  # noqa: F401
from app.modules.inventory import models as inventory_models  # noqa: F401
from app.modules.offers import models as offers_models  # noqa: F401
from app.modules.orders import models as orders_models  # noqa: F401
from app.modules.payments import models as payments_models  # noqa: F401
from app.modules.products import models as products_models  # noqa: F401
from app.modules.settings import models as settings_models  # noqa: F401
from app.modules.users import models as users_models  # noqa: F401

from app.shared.models.base import Base  # noqa: F401
