import pytest
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from backend.DB.session import dispose_engine, get_engine


@pytest.mark.asyncio
async def test_supabase_connection_executes_select_one() -> None:
    engine = get_engine()
    try:
        async with engine.connect() as connection:
            result = await connection.execute(text("SELECT 1"))
            assert result.scalar_one() == 1
    except SQLAlchemyError as error:
        original_error = getattr(error, "orig", None)
        sqlstate = getattr(original_error, "sqlstate", None)
        status = f" SQLSTATE {sqlstate}." if isinstance(sqlstate, str) else ""
        raise AssertionError(
            f"Database SELECT 1 failed ({type(error).__name__}).{status} "
            "Connection details omitted."
        ) from None
    except (OSError, TimeoutError) as error:
        raise AssertionError(
            f"Database SELECT 1 failed ({type(error).__name__}); connection details omitted."
        ) from None
    finally:
        await dispose_engine()
