from fastapi.testclient import TestClient


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert response.headers["content-type"].startswith("application/json")


def test_unknown_route_is_404_when_no_web_dist(client: TestClient) -> None:
    assert client.get("/anything").status_code == 404
