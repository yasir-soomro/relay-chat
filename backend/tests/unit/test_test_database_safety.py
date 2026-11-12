import pytest
from conftest import _validated_test_database_url


@pytest.mark.parametrize(
    "configured_url",
    [
        "postgresql+asyncpg://relay_test@db.example.com:5432/relay_test",
        "postgresql+asyncpg://relay_test@127.0.0.1:5432/relay",
        "postgresql+asyncpg://other@127.0.0.1:5432/relay_test",
        "postgresql://relay_test@127.0.0.1:5432/relay_test",
        "postgresql+asyncpg://relay_test@127.0.0.1:5432/relay_test?host=db.example.com",
    ],
)
def test_test_database_url_rejects_nonisolated_targets(configured_url: str) -> None:
    with pytest.raises(ValueError):
        _validated_test_database_url(configured_url)


def test_test_database_url_accepts_dedicated_loopback_target() -> None:
    url = _validated_test_database_url(
        "postgresql+asyncpg://relay_test@127.0.0.1:55432/relay_test"
    )

    assert url.host == "127.0.0.1"
    assert url.port == 55432
    assert url.database == "relay_test"
