from app.main import app


def test_root_route_is_registered() -> None:
    root_routes = [route for route in app.routes if getattr(route, "path", None) == "/"]
    assert root_routes, "Expected root route '/' to be registered."

    methods = set()
    for route in root_routes:
        route_methods = getattr(route, "methods", None)
        if route_methods:
            methods.update(route_methods)
    assert "GET" in methods
