from fastapi import APIRouter

from app.api.v1 import ai, auth, boards, courses, export, item_types, items, periods, schedule, tags, trash

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(periods.router)
api_router.include_router(courses.router)
api_router.include_router(items.router)
api_router.include_router(item_types.router)
api_router.include_router(tags.router)
api_router.include_router(boards.router)
api_router.include_router(schedule.router)
api_router.include_router(ai.router)
api_router.include_router(trash.router)
api_router.include_router(export.router)
api_router.include_router(export.import_router)
