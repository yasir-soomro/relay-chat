from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from backend.core.dependencies import get_user_service
from backend.core.security import CurrentUser
from backend.schemas.user import (
    UserAccountResponse,
    UserProfileUpdate,
    UserPublicProfile,
)
from backend.services.user_service import (
    UserAlreadyExistsError,
    UserNotFoundError,
    UserService,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserAccountResponse)
async def get_my_account(current_user: CurrentUser) -> UserAccountResponse:
    return UserAccountResponse.model_validate(current_user.user)


@router.patch("/me", response_model=UserAccountResponse)
async def update_my_profile(
    data: UserProfileUpdate,
    current_user: CurrentUser,
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserAccountResponse:
    try:
        return await user_service.update_profile(
            current_user.id,
            current_user.id,
            data,
        )
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        ) from None
    except UserAlreadyExistsError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User {error.field} already exists",
        ) from None


@router.get("/{user_id}", response_model=UserPublicProfile)
async def get_public_profile(
    user_id: UUID,
    current_user: CurrentUser,
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserPublicProfile:
    try:
        return await user_service.get_public_profile(user_id, current_user.id)
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        ) from None
