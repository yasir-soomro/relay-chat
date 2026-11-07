import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, WebSocket
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from starlette.websockets import WebSocketDisconnect

from backend.core.config import Settings, get_settings
from backend.DB.session import get_session_factory
from backend.repository.auth_repository import AuthRepository
from backend.repository.user_repository import UserRepository
from backend.services.auth_service import AuthService
from backend.websocket.connection_manager import (
    ConnectionManager,
    WebSocketConnection,
    get_connection_manager,
)
from backend.websocket.connections import authenticate_first_frame
from backend.websocket.events import (
    AuthEvent,
    ErrorEvent,
    inbound_event_adapter,
)
from backend.websocket.message_handler import WebSocketMessageHandler

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    settings: Annotated[Settings, Depends(get_settings)],
    session_factory: Annotated[
        async_sessionmaker[AsyncSession],
        Depends(get_session_factory),
    ],
    manager: Annotated[ConnectionManager, Depends(get_connection_manager)],
) -> None:
    await websocket.accept()

    async def authenticate(token: str):
        async with session_factory() as session:
            service = AuthService(
                UserRepository(session),
                AuthRepository(session),
                settings,
            )
            return await service.authenticate_access_token(token)

    try:
        user = await authenticate_first_frame(
            websocket,
            authenticate,
            settings.ws_auth_timeout_seconds,
        )
    except RuntimeError, WebSocketDisconnect:
        return
    if user is None:
        return

    connection = manager.register(websocket, user.id)
    handler = WebSocketMessageHandler(session_factory, manager)
    try:
        await _receive_events(websocket, connection, handler, manager)
    finally:
        await manager.unregister(connection)


async def _receive_events(
    websocket: WebSocket,
    connection: WebSocketConnection,
    handler: WebSocketMessageHandler,
    manager: ConnectionManager,
) -> None:
    while True:
        try:
            payload = await websocket.receive_json()
        except WebSocketDisconnect:
            return
        except json.JSONDecodeError, UnicodeDecodeError, TypeError:
            await _protocol_error(
                websocket,
                connection,
                manager,
                code="invalid_json",
                detail="WebSocket events must be valid JSON",
            )
            return

        try:
            event = inbound_event_adapter.validate_python(payload)
        except ValueError, TypeError:
            await _protocol_error(
                websocket,
                connection,
                manager,
                code="invalid_event",
                detail="The event does not match the WebSocket protocol",
            )
            return

        if isinstance(event, AuthEvent):
            await _protocol_error(
                websocket,
                connection,
                manager,
                code="unexpected_auth",
                detail="Authentication is only accepted as the first event",
            )
            return

        try:
            await handler.handle(connection, event)
        except RuntimeError, SQLAlchemyError:
            logger.error(
                "Unhandled WebSocket event failure",
                extra={"event_type": event.type},
            )
            await manager.send_event(
                connection,
                ErrorEvent(
                    code="internal_error",
                    detail="The operation could not be completed",
                ),
            )
            await websocket.close(code=1011, reason="Internal server error")
            return


async def _protocol_error(
    websocket: WebSocket,
    connection: WebSocketConnection,
    manager: ConnectionManager,
    *,
    code: str,
    detail: str,
) -> None:
    sent = await manager.send_event(connection, ErrorEvent(code=code, detail=detail))
    if sent:
        await websocket.close(code=4400, reason="Protocol error")
