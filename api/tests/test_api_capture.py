"""« Coller une adresse » (ADR-0014): generic extraction (JSON-LD → OpenGraph → title), the preview
route with an injected fetcher (never the network), the image download kept as a file."""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from conftest import BASE_URL, PNG_BYTES
from ffe.app import create_app
from ffe.captures.extract import extract, price_cents
from ffe.deps import Deps
from ffe.errors import ErrorDetail, ValidationAppError

JSON_LD_PAGE = """<html><head><title>Santino | Tikamoon</title>
<meta property="og:title" content="Santino - Chaise">
<meta property="og:image" content="https://media.example.com/og.jpg">
<script type='application/ld+json' id='product-jsonld'>
{"@context":"https://schema.org","@type":"Product","name":"Santino - Chaise en chêne massif et cuir",
 "image":["https://media.example.com/7718.jpg"],"description":"Cette chaise associe le chêne
et le cuir.","mpn":7718,"sku":7718,"brand":{"@type":"Brand","name":"Tikamoon"},
 "offers":{"@type":"Offer","priceCurrency":"EUR","price":"399.00"}}
</script></head><body><h1>x</h1></body></html>"""
OG_PAGE = """<html><head><title>Beat Light Fat</title>
<meta property="og:title" content="Beat Light Fat &amp; Tall" />
<meta property="og:image" content="https://cdn.example.com/beat.png" />
<meta property="product:brand" content="Tom Dixon" />
<meta property="product:price:amount" content="1 250,50" />
<meta property="product:price:currency" content="gbp" />
<meta name="description" content="Suspension en laiton." />
</head></html>"""
TITLE_PAGE = "<html><head><title> Page nue </title></head><body></body></html>"


def test_json_ld_product_wins_and_opengraph_fills_the_holes() -> None:
    found = extract(JSON_LD_PAGE)
    assert found.source == "json-ld"
    assert found.name == "Santino - Chaise en chêne massif et cuir"
    assert found.brand == "Tikamoon" and found.reference == "7718"
    assert found.image_url == "https://media.example.com/7718.jpg"
    assert found.price_cents == 39_900 and found.currency == "EUR"
    assert found.description == "Cette chaise associe le chêne et le cuir."


def test_opengraph_then_title_fallbacks() -> None:
    og = extract(OG_PAGE)
    assert og.source == "opengraph" and og.name == "Beat Light Fat & Tall"
    assert og.brand == "Tom Dixon" and og.image_url == "https://cdn.example.com/beat.png"
    assert og.price_cents == 125_050 and og.currency == "GBP"
    assert og.description == "Suspension en laiton."
    title = extract(TITLE_PAGE)
    assert title.source == "title" and title.name == "Page nue" and title.price_cents is None


@pytest.mark.parametrize(
    ("text", "cents"),
    [
        ("399.00", 39_900),
        ("1 250,50", 125_050),
        ("1,250.50", 125_050),
        (399, 39_900),
        ("abc", None),
        ("-5", None),
    ],
)
def test_price_cents_reads_the_usual_formats(text: Any, cents: int | None) -> None:
    assert price_cents(text) == cents


def fake_fetcher(pages: dict[str, tuple[bytes, str]]):  # noqa: ANN201
    def fetch(url: str, _max_bytes: int) -> tuple[bytes, str]:
        if url not in pages:
            raise AssertionError(f"adresse inattendue : {url}")
        return pages[url]

    return fetch


@pytest.fixture
def capture_client(deps: Deps) -> TestClient:
    deps.fetch_url = fake_fetcher(
        {
            "https://shop.example.com/santino": (JSON_LD_PAGE.encode(), "text/html; charset=utf-8"),
            "https://media.example.com/7718.jpg": (PNG_BYTES, "image/png"),
            "https://shop.example.com/nothing": (b"<html><body>rien</body></html>", "text/html"),
            "https://shop.example.com/file.pdf": (b"%PDF-1.4", "application/pdf"),
        }
    )
    return TestClient(create_app(deps), base_url=BASE_URL)


def test_preview_returns_the_generic_fields(capture_client: TestClient) -> None:
    response = capture_client.get(
        "/api/v1/captures/preview", params={"url": "https://shop.example.com/santino"}
    )
    assert response.status_code == 200, response.text
    assert response.json() == {
        "url": "https://shop.example.com/santino",
        "name": "Santino - Chaise en chêne massif et cuir",
        "brand": "Tikamoon",
        "reference": "7718",
        "imageUrl": "https://media.example.com/7718.jpg",
        "priceCents": 39900,
        "currency": "EUR",
        "description": "Cette chaise associe le chêne et le cuir.",
        "source": "json-ld",
    }


@pytest.mark.parametrize(
    ("url", "message"),
    [
        ("ftp://x/y", "http://"),
        ("https://shop.example.com/nothing", "Aucune fiche"),
        ("https://shop.example.com/file.pdf", "pas une page web"),
    ],
)
def test_preview_refusals_are_422_on_url(
    capture_client: TestClient, url: str, message: str
) -> None:
    response = capture_client.get("/api/v1/captures/preview", params={"url": url})
    assert response.status_code == 422, response.text
    assert response.json()["details"][0]["field"] == "url"
    assert message in response.json()["details"][0]["message"]


def test_image_is_downloaded_once_and_kept_with_its_source(capture_client: TestClient) -> None:
    first = capture_client.post(
        "/api/v1/captures/image", json={"url": "https://media.example.com/7718.jpg"}
    )
    assert first.status_code == 201, first.text
    body = first.json()
    assert body["mimeType"] == "image/png" and body["originalName"] == "7718.jpg.png"
    assert body["sourceUrl"] == "https://media.example.com/7718.jpg"
    again = capture_client.post(
        "/api/v1/captures/image", json={"url": "https://media.example.com/7718.jpg"}
    )
    assert again.status_code == 201 and again.json()["id"] == body["id"]  # same sha256, same row
    assert capture_client.get(f"/api/v1/files/{body['id']}/content").status_code == 200
    refused = capture_client.post(
        "/api/v1/captures/image", json={"url": "https://shop.example.com/santino"}
    )
    assert refused.status_code == 422 and "JPEG" in refused.json()["details"][0]["message"]


def test_the_real_fetcher_is_the_default_and_refuses_bad_schemes(deps: Deps) -> None:
    client = TestClient(create_app(deps), base_url=BASE_URL)
    response = client.get("/api/v1/captures/preview", params={"url": "mailto:x@y.z"})
    assert response.status_code == 422


# --- extension inbox (ADR-0017) ---------------------------------------------------------------


def page(html: str) -> dict[str, Any]:
    """The HTML travels as a file part (a form field is capped at 1 Mo)."""
    return {"html": ("page.html", html.encode(), "text/html")}


def _token(client: TestClient) -> str:
    body = client.post("/api/v1/settings/extension-token").json()
    assert body["extensionToken"]
    return str(body["extensionToken"])


def test_inbox_requires_the_extension_token(capture_client: TestClient) -> None:
    data = {"url": "https://shop.example.com/santino"}
    assert (
        capture_client.post("/api/v1/captures", data=data, files=page(JSON_LD_PAGE)).status_code
        == 401
    )
    assert capture_client.get("/api/v1/settings").json()["extensionToken"] is None
    token = _token(capture_client)
    wrong = capture_client.post(
        "/api/v1/captures", data=data, files=page(JSON_LD_PAGE), headers={"X-FFE-Token": "x"}
    )
    assert wrong.status_code == 401 and wrong.json()["code"] == "unauthorized"
    assert (
        capture_client.post(
            "/api/v1/captures", data=data, files=page(JSON_LD_PAGE), headers={"X-FFE-Token": token}
        ).status_code
        == 201
    )
    renewed = _token(capture_client)
    assert renewed != token
    assert (
        capture_client.post(
            "/api/v1/captures", data=data, files=page(JSON_LD_PAGE), headers={"X-FFE-Token": token}
        ).status_code
        == 401
    )


def test_inbox_keeps_the_sheet_downloads_the_image_and_is_consumed(
    capture_client: TestClient, settings: Any
) -> None:
    token = _token(capture_client)
    created = capture_client.post(
        "/api/v1/captures",
        data={"url": "https://shop.example.com/santino"},
        files=page(JSON_LD_PAGE),
        headers={"X-FFE-Token": token},
    )
    assert created.status_code == 201, created.text
    body = created.json()
    preview = body["preview"]
    assert preview["name"] == "Santino - Chaise en chêne massif et cuir"
    assert preview["brand"] == "Tikamoon" and preview["priceCents"] == 39_900
    assert body["image"] is not None  # downloaded by the server through the fetcher
    listed = capture_client.get("/api/v1/captures").json()
    assert [c["id"] for c in listed] == [body["id"]]
    assert capture_client.delete(f"/api/v1/captures/{body['id']}").status_code == 204
    assert capture_client.get("/api/v1/captures").json() == []
    assert capture_client.get(f"/api/v1/files/{body['image']['id']}/content").status_code == 404
    assert not any(settings.files_dir.iterdir())  # orphan image removed with the capture
    assert capture_client.delete(f"/api/v1/captures/{body['id']}").status_code == 404


def test_inbox_image_comes_from_the_extension_when_the_server_cannot(
    deps: Deps, settings: Any
) -> None:
    def refusing(url: str, _max_bytes: int) -> tuple[bytes, str]:  # a Cloudflare-protected CDN
        raise ValidationAppError([ErrorDetail("url", f"La page répond 403 ({url}).")])

    deps.fetch_url = refusing
    client = TestClient(create_app(deps), base_url=BASE_URL)
    token = _token(client)
    headers = {"X-FFE-Token": token}
    data = {"url": "https://shop.example.com/santino"}
    created = client.post(
        "/api/v1/captures", data=data, files=page(JSON_LD_PAGE), headers=headers
    ).json()
    assert created["image"] is None and created["preview"]["imageUrl"].endswith("7718.jpg")
    attached = client.post(
        f"/api/v1/captures/{created['id']}/image",
        files={"image": ("7718.jpg", PNG_BYTES, "image/jpeg")},
        headers=headers,
    )
    assert attached.status_code == 200, attached.text
    assert attached.json()["image"]["mimeType"] == "image/png"
    with_image = client.post(
        "/api/v1/captures",
        data=data,
        files={**page(JSON_LD_PAGE), "image": ("photo.png", PNG_BYTES, "image/png")},
        headers=headers,
    ).json()
    assert with_image["image"]["id"] == attached.json()["image"]["id"]  # same sha256, same file
    nothing = client.post(
        "/api/v1/captures",
        data={"url": "https://shop.example.com/nothing"},
        files=page("<html><body>rien</body></html>"),
        headers=headers,
    )
    assert nothing.status_code == 422 and nothing.json()["details"][0]["field"] == "url"
    bad = client.post(
        f"/api/v1/captures/{created['id']}/image",
        files={"image": ("x.txt", b"hello", "text/plain")},
        headers=headers,
    )
    assert bad.status_code == 422
    big = client.post(
        "/api/v1/captures",
        data=data,
        files=page("<html><title>x</title>" + "a" * (5 * 1024 * 1024 + 1)),
        headers=headers,
    )
    assert big.status_code == 422 and big.json()["details"][0]["field"] == "html"


def test_only_a_chrome_extension_origin_gets_cors_headers(client: TestClient) -> None:
    preflight = client.options(
        "/api/v1/captures",
        headers={
            "Origin": "chrome-extension://" + "a" * 32,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "X-FFE-Token",
        },
    )
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] == "chrome-extension://" + "a" * 32
    assert "x-ffe-token" in preflight.headers["access-control-allow-headers"].lower()
    other = client.options(
        "/api/v1/captures",
        headers={"Origin": "https://evil.example.com", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in other.headers
