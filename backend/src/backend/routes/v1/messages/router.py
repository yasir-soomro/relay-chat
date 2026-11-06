from fastapi import APIRouter

from backend.routes.v1.messages.create import router as create_router
from backend.routes.v1.messages.delete import router as delete_router
from backend.routes.v1.messages.delivery import router as delivery_router
from backend.routes.v1.messages.delivery_batch import router as delivery_batch_router
from backend.routes.v1.messages.get import router as get_router
from backend.routes.v1.messages.list import router as list_router
from backend.routes.v1.messages.read import router as read_router
from backend.routes.v1.messages.update import router as update_router

router = APIRouter(tags=["messages"])
router.include_router(create_router)
router.include_router(list_router)
router.include_router(get_router)
router.include_router(update_router)
router.include_router(delete_router)
router.include_router(delivery_router)
router.include_router(delivery_batch_router)
router.include_router(read_router)
