from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from backend.core.config import Settings, get_settings
from backend.core.dependencies import get_auth_service
from backend.core.security import CurrentUser, require_allowed_origin
from backend.schemas.auth import LoginRequest, RegistrationResponse, TokenResponse
from backend.schemas.user import UserAccountResponse, UserCreate
from backend.services.auth_service import (
    AuthenticationConfigurationError,
    AuthService,
    InvalidAuthenticationTokenError,
    InvalidCredentialsError,
    IssuedTokens,
    RefreshTokenReuseError,
    UserAlreadyExistsError,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


def _set_refresh_cookie(
    response: Response,
    tokens: IssuedTokens,
    settings: Settings,
) -> None:
    max_age = max(
        int((tokens.refresh_expires_at - datetime.now(UTC)).total_seconds()),
        0,
    )
    response.set_cookie(
        key="relay_refresh_token",
        value=tokens.refresh_token,
        max_age=max_age,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="strict",
        path="/auth",
    )


def _clear_refresh_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key="relay_refresh_token",
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="strict",
        path="/auth",
    )


def _refresh_cookie_deletion_header(settings: Settings) -> str:
    response = Response()
    _clear_refresh_cookie(response, settings)
    return response.headers["set-cookie"]


@router.post(
    "/register",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    data: UserCreate,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> RegistrationResponse:
    try:
        user = await auth_service.register(data)
    except UserAlreadyExistsError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User {error.field} already exists",
        ) from None
    return RegistrationResponse(user=user)


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(require_allowed_origin)],
)
async def login(
    data: LoginRequest,
    response: Response,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenResponse:
    try:
        _, issued_tokens, _ = await auth_service.login(data)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except AuthenticationConfigurationError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        ) from None

    _set_refresh_cookie(response, issued_tokens, settings)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return TokenResponse(
        access_token=issued_tokens.access_token,
        expires_in=issued_tokens.expires_in,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    dependencies=[Depends(require_allowed_origin)],
)
async def refresh(
    request: Request,
    response: Response,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenResponse:
    try:
        issued_tokens, _ = await auth_service.refresh(
            request.cookies.get("relay_refresh_token")
        )
    except RefreshTokenReuseError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"Set-Cookie": _refresh_cookie_deletion_header(settings)},
        ) from None
    except InvalidAuthenticationTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"Set-Cookie": _refresh_cookie_deletion_header(settings)},
        ) from None
    except AuthenticationConfigurationError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        ) from None

    _set_refresh_cookie(response, issued_tokens, settings)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return TokenResponse(
        access_token=issued_tokens.access_token,
        expires_in=issued_tokens.expires_in,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_allowed_origin)],
)
async def logout(
    response: Response,
    current_user: CurrentUser,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> Response:
    await auth_service.logout(current_user.session_id)
    _clear_refresh_cookie(response, settings)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserAccountResponse)
async def get_current_account(current_user: CurrentUser) -> UserAccountResponse:
    return UserAccountResponse.model_validate(current_user.user)
