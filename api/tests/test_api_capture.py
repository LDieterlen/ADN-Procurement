"""« Coller une adresse » (ADR-0014): generic extraction (JSON-LD → OpenGraph → title), the preview
route with an injected fetcher (never the network), the image download kept as a file."""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from conftest import BASE_URL, PNG_BYTES
from ffe.app import create_app
from ffe.captures.extract import extract, price_cents
from ffe.deps import Deps

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
