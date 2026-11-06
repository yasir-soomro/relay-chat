from typing import Annotated, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status

from backend.core.dependencies import get_connection_service
from backend.core.security import CurrentUser
from backend.schemas.connection import (
    BlockResponse,
    ConnectionListResponse,
    ConnectionRequestCreate,
    ConnectionResponse,
)
from backend.services.connection_service import (
    BlockAlreadyExistsError,
    BlockNotFoundError,
    ConnectionAlreadyExistsError,
    ConnectionBlockedError,
    ConnectionCooldownActiveError,
    ConnectionCooldownNotConfiguredError,
    ConnectionManagementError,
    ConnectionNotFoundError,
    ConnectionPermissionError,
    ConnectionService,
    ConnectionUserNotFoundError,
    DuplicateConnectionRequestError,
    InvalidConnectionTransitionError,
    SelfConnectionError,
)

router = APIRouter(prefix="/connections", tags=["connections"])


def _raise_http_error(error: ConnectionManagementError) -> NoReturn:
    if isinstance(error, SelfConnectionError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot connect with yourself",
        ) from None
    if isinstance(error, ConnectionPermissionError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to perform this action",
        ) from None
    if isinstance(
        error,
        (ConnectionBlockedError, ConnectionNotFoundError, ConnectionUserNotFoundError),
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection or user not found",
        ) from None
    if isinstance(error, ConnectionCooldownNotConfiguredError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Connection request cooldown is not configured",
        ) from None
    if isinstance(error, ConnectionCooldownActiveError):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Connection request cooldown has not elapsed",
        ) from None
    if isinstance(
        error,
        (
            BlockAlreadyExistsError,
            ConnectionAlreadyExistsError,
            DuplicateConnectionRequestError,
            InvalidConnectionTransitionError,
        ),
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Connection state does not allow this action",
        ) from None
    if isinstance(error, BlockNotFoundError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found",
        ) from None
    raise error


@router.post(
    "/requests",
    response_model=ConnectionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_request(
    data: ConnectionRequestCreate,
    current_user: CurrentUser,
    service: Annotated[ConnectionService, Depends(get_connection_service)],
) -> ConnectionResponse:
    try:
        return await service.request_connection(current_user.id, data.recipient_id)
    except ConnectionManagementError as error:
        _raise_http_error(error)


@router.get("/requests/incoming", response_model=ConnectionListResponse)
async def incoming_requests(
    current_user: CurrentUser,
    service: Annotated[ConnectionService, Depends(get_connection_service)],
) -> ConnectionListResponse:
    return await service.list_incoming_requests(current_user.id)


@router.get("/requests/outgoing", response_model=ConnectionListResponse)
async def outgoing_requests(
    current_user: CurrentUser,
    service: Annotated[ConnectionService, Depends(get_connection_service)],
) -> ConnectionListResponse:
    return await service.list_outgoing_requests(current_user.id)


@router.post("/requests/{connection_id}/accept", response_model=ConnectionResponse)
async def accept_request(
    connection_id: UUID,
    current_user: CurrentUser,
    service: Annotated[ConnectionService, Depends(get_connection_service)],
) -> ConnectionResponse:
    try:
        return await service.accept_request(connection_id, current_user.id)
    except ConnectionManagementError as error:
        _raise_http_error(error)


@router.post("/requests/{connection_id}/reject", response_model=ConnectionResponse)
async def reject_request(
    connection_id: UUID,
    current_user: CurrentUser,
    service: Annotated[ConnectionService, Depends(get_connection_service)],
) -> ConnectionResponse:
    try:
        return await service.reject_request(connection_id, current_user.id)
    except ConnectionManagementError as error:
        _raise_http_error(error)


@router.delete("/{other_user_id}", response_model=ConnectionResponse)
async def remove_connection(
    other_user_id: UUID,
    current_user: CurrentUser,
    service: Annotated[ConnectionService, Depends(get_connection_service)],
) -> ConnectionResponse:
    try:
        return await service.remove_connection(current_user.id, other_user_id)
    except ConnectionManagementError as error:
        _raise_http_error(error)


@router.post("/{other_user_id}/block", response_model=BlockResponse)
async def block_user(
    other_user_id: UUID,
    current_user: CurrentUser,
    service: Annotated[ConnectionService, Depends(get_connection_service)],
) -> BlockResponse:
    try:
        return await service.block_user(current_user.id, other_user_id)
    except ConnectionManagementError as error:
        _raise_http_error(error)


@router.delete("/{other_user_id}/block", status_code=status.HTTP_204_NO_CONTENT)
async def unblock_user(
    other_user_id: UUID,
    current_user: CurrentUser,
    service: Annotated[ConnectionService, Depends(get_connection_service)],
) -> Response:
    try:
        await service.unblock_user(current_user.id, other_user_id)
    except ConnectionManagementError as error:
        _raise_http_error(error)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("", response_model=ConnectionListResponse)
async def accepted_connections(
    current_user: CurrentUser,
    service: Annotated[ConnectionService, Depends(get_connection_service)],
) -> ConnectionListResponse:
    return await service.list_connections(current_user.id)
