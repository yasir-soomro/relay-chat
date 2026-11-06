from fastapi import APIRouter

from backend.routes.v1.auth import router as auth_router
from backend.routes.v1.connections import router as connections_router
from backend.routes.v1.conversations.router import router as conversations_router
from backend.routes.v1.messages.router import router as messages_router
from backend.routes.v1.users import router as users_router
from backend.routes.v1.websocket import router as websocket_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(connections_router)
router.include_router(conversations_router)
router.include_router(messages_router)
router.include_router(users_router)
router.include_router(websocket_router)
