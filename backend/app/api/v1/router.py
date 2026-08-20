from fastapi import APIRouter

from app.api.v1 import boards, courses, item_types, items, periods, tags

api_router = APIRouter()
api_router.include_router(periods.router)
api_router.include_router(courses.router)
api_router.include_router(items.router)
api_router.include_router(item_types.router)
api_router.include_router(tags.router)
api_router.include_router(boards.router)
