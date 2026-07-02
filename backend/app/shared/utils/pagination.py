"""Pagination helper — keeps page/page_size clamping consistent across every module."""
from app.core.config import settings


def clamp_pagination(page: int, page_size: int) -> tuple[int, int]:
    page = max(1, page)
    page_size = max(1, min(page_size, settings.MAX_PAGE_SIZE))
    return page, page_size


def offset_for(page: int, page_size: int) -> int:
    return (page - 1) * page_size
