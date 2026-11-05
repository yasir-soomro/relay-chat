from backend.main import app


def test_authentication_and_user_routes_are_registered() -> None:
    route_paths = set(app.openapi()["paths"])

    assert {
        "/auth/register",
        "/auth/login",
        "/auth/refresh",
        "/auth/logout",
        "/auth/me",
        "/users/me",
        "/health",
    }.issubset(route_paths)
