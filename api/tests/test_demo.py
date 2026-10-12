"""`ffe db seed --demo`: the example project is built through the services, once, and adds up."""

from fastapi.testclient import TestClient
from sqlalchemy import Engine

from ffe.db.seed import seed_categories
from ffe.demo import DEMO_CODE, seed_demo
from ffe.deps import Clock


def test_demo_project_is_created_once_and_consistent(
    engine: Engine, clock: Clock, client: TestClient
) -> None:
    seed_categories(engine, clock)
    project = seed_demo(engine, clock)
    assert project is not None and project.code == DEMO_CODE
    assert seed_demo(engine, clock) is None
    items = client.get(f"/api/v1/projects/{project.id}/project-items").json()
    assert len(items) == 5 and {i["kind"] for i in items} == {"product", "fee"}
    codes = sorted(i["itemCode"] for i in items)
    assert codes == ["BAR-TBR-01", "CHA-LIT-01", "CHA-LUD-01", "FR-01", "LOB-AS-01"]
    summary = client.get(f"/api/v1/projects/{project.id}/summary").json()
    assert summary["budgetCents"] == 85_000_000
    assert summary["specifiedCents"] == sum(
        line["totalHtCents"] for line in summary["lines"] if line["counted"]
    )
    assert [row["key"] for row in summary["byZone"]] == ["Hébergement", "Zones communes", ""]
    assert client.get(f"/api/v1/projects/{project.id}/exports/sheets.pdf").status_code == 200
