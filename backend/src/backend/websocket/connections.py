import asyncio
import json
import logging
from collections.abc import Awaitable, Callable
from typing import Any, Protocol

from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.websockets import WebSocketDisconnect

from backend.services.auth_service import (
    AuthenticatedUser,
    AuthenticationConfigurationError,
    InvalidAuthenticationTokenError,
)
from backend.websocket.connection_manager import SocketWriter
from backend.websocket.events import AuthEvent, AuthOKEvent, ErrorEvent

TokenAuthenticator = Callable[[str], Awaitable[AuthenticatedUser]]
logger = logging.getLogger(__name__)


class FirstFrameSocket(SocketWriter, Protocol):
    async def receive_json(self) -> Any: ...

    async def close(self, *, code: int, reason: str) -> None: ...


async def authenticate_first_frame(
    websocket: FirstFrameSocket,
    authenticate: TokenAuthenticator,
    timeout_seconds: float,
) -> AuthenticatedUser | None:
    try:
        user = await asyncio.wait_for(
            _receive_and_authenticate(websocket, authenticate),
            timeout=timeout_seconds,
        )
    except TimeoutError:
        await _reject(
            websocket,
            code=4401,
            reason="Authentication timeout",
            error_code="authentication_timeout",
            detail="Send a valid auth event before the authentication deadline",
        )
        return None
    except WebSocketDisconnect:
        return None
    except InvalidAuthenticationTokenError:
        await _reject(
            websocket,
            code=4401,
            reason="Authentication failed",
            error_code="unauthorized",
            detail="Invalid or expired authentication token",
        )
        return None
    except AuthenticationConfigurationError:
        await _reject(
            websocket,
            code=1011,
            reason="Authentication unavailable",
            error_code="authentication_unavailable",
            detail="Authentication is temporarily unavailable",
        )
        return None
    except ValidationError, json.JSONDecodeError, UnicodeDecodeError, TypeError:
        await _reject(
            websocket,
            code=4400,
            reason="Invalid authentication event",
            error_code="invalid_auth_event",
            detail="The first event must be a valid auth event",
        )
        return None
    except RuntimeError, SQLAlchemyError:
        logger.error("Unexpected WebSocket authentication failure")
        await _reject(
            websocket,
            code=1011,
            reason="Authentication unavailable",
            error_code="authentication_unavailable",
            detail="Authentication is temporarily unavailable",
        )
        return None

    await websocket.send_json(AuthOKEvent(user_id=user.id).model_dump(mode="json"))
    return user


async def _receive_and_authenticate(
    websocket: FirstFrameSocket,
    authenticate: TokenAuthenticator,
) -> AuthenticatedUser:
    event = AuthEvent.model_validate(await websocket.receive_json())
    return await authenticate(event.access_token)


async def _reject(
    websocket: FirstFrameSocket,
    *,
    code: int,
    reason: str,
    error_code: str,
    detail: str,
) -> None:
    try:
        await websocket.send_json(
            ErrorEvent(code=error_code, detail=detail).model_dump(mode="json")
        )
    except RuntimeError, WebSocketDisconnect:
        return
    await websocket.close(code=code, reason=reason)
