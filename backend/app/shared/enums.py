"""Enums shared across modules. Central to avoid duplicated/inconsistent string literals."""
import enum


class RoleName(str, enum.Enum):
    ADMIN = "admin"
    CUSTOMER = "customer"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PACKED = "packed"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


# Which transitions are legal — enforced in orders/service.py, not left to the client.
ORDER_STATUS_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.PACKED, OrderStatus.CANCELLED},
    OrderStatus.PACKED: {OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED},
    OrderStatus.OUT_FOR_DELIVERY: {OrderStatus.DELIVERED},
    OrderStatus.DELIVERED: set(),
    OrderStatus.CANCELLED: set(),
}


class PaymentMethod(str, enum.Enum):
    COD = "cod"
    STATIC_QR = "static_qr"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class DiscountType(str, enum.Enum):
    PERCENT = "percent"
    FLAT = "flat"


class OfferAppliesTo(str, enum.Enum):
    PRODUCT = "product"
    CATEGORY = "category"
    ORDER = "order"
