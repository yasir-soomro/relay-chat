from backend.main import app


def test_authentication_and_user_routes_are_registered() -> None:
    route_paths = set(app.openapi()["paths"])

    assert {
        "/auth/register",
        "/auth/login",
        "/auth/refresh",
        "/auth/logout",
        "/auth/me",
        "/connections",
        "/connections/requests",
        "/connections/requests/incoming",
        "/connections/requests/outgoing",
        "/connections/requests/{connection_id}/accept",
        "/connections/requests/{connection_id}/reject",
        "/connections/{other_user_id}",
        "/connections/{other_user_id}/block",
        "/users/me",
        "/health",
        "/health/ready",
    }.issubset(route_paths)
