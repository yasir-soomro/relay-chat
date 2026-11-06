from fastapi import APIRouter

from backend.routes.v1.conversations.create import router as create_router
from backend.routes.v1.conversations.get import router as get_router
from backend.routes.v1.conversations.list import router as list_router

router = APIRouter(tags=["conversations"])
router.include_router(create_router, prefix="/conversations")
router.include_router(list_router, prefix="/conversations")
router.include_router(get_router, prefix="/conversations")
