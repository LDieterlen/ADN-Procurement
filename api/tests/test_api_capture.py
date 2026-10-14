"""« Coller une adresse » (ADR-0014): generic extraction (JSON-LD → OpenGraph → title), the preview
route with an injected fetcher (never the network), the image download kept as a file."""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from conftest import BASE_URL, PNG_BYTES
from ffe.app import create_app
from ffe.captures.extract import (
    _text,
    extract,
    find_dimensions,
    find_lead_time,
    guess_type,
    price_cents,
)
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
            "https://media.example.com/og.jpg": (PNG_BYTES + b"og", "image/png"),
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
        "typeCode": "AS",
        "dimensions": None,
        "leadTime": None,
        "imageUrls": ["https://media.example.com/7718.jpg", "https://media.example.com/og.jpg"],
        "finish": None,
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
    # Every photo of the page (JSON-LD image, then og:image) downloaded by the server, in order.
    assert [i["sourceUrl"] for i in body["images"]] == preview["imageUrls"]
    assert len(body["images"]) == 2
    listed = capture_client.get("/api/v1/captures").json()
    assert [c["id"] for c in listed] == [body["id"]]
    assert capture_client.delete(f"/api/v1/captures/{body['id']}").status_code == 204
    assert capture_client.get("/api/v1/captures").json() == []
    for image in body["images"]:
        assert capture_client.get(f"/api/v1/files/{image['id']}/content").status_code == 404
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
    assert created["images"] == [] and len(created["preview"]["imageUrls"]) == 2
    attached = client.post(
        f"/api/v1/captures/{created['id']}/image",
        data={"url": "https://media.example.com/7718.jpg"},
        files={"image": ("7718.jpg", PNG_BYTES, "image/jpeg")},
        headers=headers,
    )
    assert attached.status_code == 200, attached.text
    assert attached.json()["images"][0]["mimeType"] == "image/png"
    assert attached.json()["images"][0]["sourceUrl"] == "https://media.example.com/7718.jpg"
    second = client.post(
        f"/api/v1/captures/{created['id']}/image",
        data={"url": "https://media.example.com/og.jpg"},
        files={"image": ("og.jpg", PNG_BYTES + b"og", "image/jpeg")},
        headers=headers,
    ).json()
    assert [i["sourceUrl"] for i in second["images"]] == created["preview"]["imageUrls"]  # appended
    with_image = client.post(
        "/api/v1/captures",
        data=data,
        files={**page(JSON_LD_PAGE), "image": ("photo.png", PNG_BYTES, "image/png")},
        headers=headers,
    ).json()
    assert with_image["images"][0]["id"] == attached.json()["images"][0]["id"]  # same sha256
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


def test_guesses_type_dimensions_and_lead_time_generically() -> None:
    assert guess_type("Canapé d'angle en bouclette, ARMENTO") == "AS"
    assert guess_type("Taie d'oreiller chanvre lavé, Helm") == "LIN"
    assert guess_type("Santino", ("Séjour", "Chaises séjour")) == "AS"
    assert guess_type("Table basse en plaqué noyer") == "TAB"
    assert guess_type("Truc inconnu") is None
    assert find_dimensions("Canapé 3 places, 220 x 95 x 80 cm en bouclette") == "220 × 95 × 80 cm"
    assert find_dimensions("Dimensions produit : H 78 × L 56.10 × P 60.50 cm") == (
        "H 78 × L 56.10 × P 60.50 cm"
    )
    assert find_dimensions("Hauteur : 75 cm, Largeur : 120 cm") == "H 75 cm × L 120 cm"
    page = (
        "Dimensions Longueur : 258 cm Hauteur : 84 cm Profondeur : 222 cm "
        "Assise : L199 x H45 x P62 cm Longueur manchot : 152 cm Poids : 110 kg"
    )
    assert find_dimensions(page) == "L 258 cm × H 84 cm × P 222 cm"  # the sofa, not its seat
    assert find_dimensions("Dimensions colis : H 115 × L 88 × P 63 cm") is None  # only a package
    assert find_dimensions("Hauteur : 84 cm") is None  # one figure alone: not clear enough
    # AM.PM-like descriptions (HTML lists inside the JSON-LD description)
    ampm = (
        "<p>Dimensions</p><ul><li>Totales</li><li>Largeur : 120 cm</li><li>Hauteur : 31,5 cm</li>"
        "<li>Profondeur : 80 cm</li><li>Utiles</li><li>Niche : 77 x 39 x 19 cm</li></ul>"
    )
    assert find_dimensions(_text(ampm)) == "L 120 cm × H 31,5 cm × P 80 cm"
    bed = "Dimensions • Couchage 160 x 200 cm • Largeur : 160 cm • Hauteur : 33 cm • Longueur : 204 cm"
    assert (
        find_dimensions(bed) == "l 160 cm × H 33 cm × L 204 cm"
    )  # l = largeur when a longueur is there
    vase = "Vase rayé, hauteur 25 cm, sugar. Dimensions • Diamètre : 12 cm • Hauteur : 28 cm"
    assert find_dimensions(vase) == "Ø 12 cm × H 28 cm"
    assert find_dimensions("Suspension Ø 36 cm x H 30 cm") == "Ø 36 cm × H 30 cm"
    assert find_dimensions("rien", None) is None
    assert find_lead_time("Livraison sous 3 à 5 semaines") == "3 à 5 semaines"
    assert find_lead_time("Expédié en 2 jours ouvrés") == "2 jours ouvrés"
    assert find_lead_time("Prix : 3 semaines de salaire") is None
    page = JSON_LD_PAGE.replace(
        "</head>",
        '<script type="application/ld+json">{"@type":"BreadcrumbList","itemListElement":'
        '[{"@type":"ListItem","position":1,"item":{"name":"Accueil"}},'
        '{"@type":"ListItem","position":2,"item":{"name":"Chaises séjour"}}]}</script></head>',
    )
    found = extract(page)
    assert found.type_code == "AS"  # « Chaise » in the name
    coloured = JSON_LD_PAGE.replace(
        '"name":"Santino', '"color":"Chêne naturel","material":"chêne massif","name":"Santino'
    )
    assert extract(coloured).finish == "Chêne naturel, chêne massif"


def test_every_product_photo_is_listed_once_in_page_order() -> None:
    from ffe.captures.extract import MAX_IMAGES, image_urls

    page = (
        '<script type="application/ld+json">{"@type":"Product","name":"Banquette","image":'
        '["https://cdn.example.com/1.jpg",{"@type":"ImageObject","contentUrl":"https://cdn.example.com/2.jpg"},'
        '"https://cdn.example.com/1.jpg","data:x"]}</script>'
        '<meta property="og:image" content="https://cdn.example.com/og.jpg">'
    )
    assert image_urls(page) == (
        "https://cdn.example.com/1.jpg",
        "https://cdn.example.com/2.jpg",
        "https://cdn.example.com/og.jpg",
    )
    urls = ",".join(f'"https://cdn.example.com/{n}.jpg"' for n in range(30))
    many = '{"@type":"Product","name":"x","image":[' + urls + "]}"
    assert len(image_urls(f'<script type="application/ld+json">{many}</script>')) == MAX_IMAGES


def test_sale_price_list_keeps_the_current_price_not_the_struck_one() -> None:
    page = JSON_LD_PAGE.replace(
        '"offers":{"@type":"Offer","priceCurrency":"EUR","price":"399.00"}',
        '"offers":{"@type":"Offer","priceSpecification":[{"@type":"UnitPriceSpecification",'
        '"price":569.26,"priceCurrency":"EUR"},{"@type":"UnitPriceSpecification",'
        '"priceType":"https://schema.org/StrikethroughPrice","price":759,"priceCurrency":"EUR"}]}',
    )
    assert "StrikethroughPrice" in page, "fixture must carry the sale offer"
    found = extract(page)
    assert found.price_cents == 56_926 and found.currency == "EUR"


def test_preview_carries_the_guesses(capture_client: TestClient) -> None:
    body = capture_client.get(
        "/api/v1/captures/preview", params={"url": "https://shop.example.com/santino"}
    ).json()
    assert body["typeCode"] == "AS" and "dimensions" in body and "leadTime" in body


# A page whose JSON-LD product only comes with JavaScript: the raw HTML read by « Coller une
# adresse » has the breadcrumb, OpenGraph and an analytics tag (shape seen on a real shop).
TRACKED_PAGE = """<html><head>
<meta property="og:url" content="https://shop.example.com/prod-lampe-stylo-refm116988701.html" />
<meta property="og:title" content="Lampe Stylo Marque / LED - Noir | Boutique" />
<meta property="og:description" content="Livraison en 2-3 jours ouvrés ! Lampe 0.13 x 1.73 x 16.5 cm" />
<meta property="og:image" content="https://cdn.example.com/stylo.jpg" />
</head><body>
<div data-productinfogtm="{&quot;name&quot;:&quot;Autre lampe&quot;,&quot;id&quot;:&quot;M999999999&quot;,&quot;price&quot;:&quot;10.00&quot;}"></div>
<div data-productinfogtm="{&quot;name&quot;:&quot;Lampe Stylo noir \\/ LED&quot;,&quot;id&quot;:&quot;M116988701&quot;,&quot;price&quot;:&quot;290.83&quot;,&quot;brand&quot;:&quot;Marque&quot;,&quot;currencyCode&quot;:&quot;EUR&quot;}"></div>
<ul><li>Dimensions : <span>H 178 cm x Ø 16,5 cm - Câble : L 300 cm max.</span></li></ul>
</body></html>"""


def test_tracking_tag_fills_a_page_without_json_ld_product() -> None:
    found = extract(TRACKED_PAGE)
    assert found.source == "opengraph"
    assert found.name == "Lampe Stylo noir / LED"  # the page's own product, not the neighbour
    assert found.brand == "Marque" and found.reference == "M116988701"
    assert found.price_cents == 29_083 and found.currency == "EUR"
    assert found.image_url == "https://cdn.example.com/stylo.jpg"
    assert found.dimensions == "H 178 cm × Ø 16,5 cm"  # the « Dimensions : » line, not the meta
    assert found.lead_time == "2-3 jours ouvrés"
    neighbour_only = TRACKED_PAGE.replace("M116988701&quot;", "M000000000&quot;")
    assert extract(neighbour_only).price_cents is None  # no tag of this page: nothing taken
