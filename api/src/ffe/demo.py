"""`ffe db seed --demo`: an example project built through the services (never raw SQL), with the
vocabulary of the user's brief — zones, levels, locations, families, types, statuses."""

from sqlalchemy import Engine, select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.models import Category, Project
from ffe.schemas.budget import BudgetLineIn, BudgetLinesPut
from ffe.schemas.client import ClientCreate
from ffe.schemas.location import LocationCreate
from ffe.schemas.project import ProjectCreate
from ffe.schemas.project_item import PlacementCreate, ProjectItemCreate, StatusChange
from ffe.schemas.supplier import SupplierCreate
from ffe.services.budget import put_budget_lines
from ffe.services.client import create_client
from ffe.services.location import create_location
from ffe.services.project import create_project
from ffe.services.project_item import change_status, create_item
from ffe.services.supplier import create_supplier

DEMO_CODE = "DEMO-001"


def seed_demo(engine: Engine, clock: Clock) -> Project | None:
    """Creates the demo project once (by code); returns None when it already exists."""
    with Session(engine, expire_on_commit=False) as session:
        with session.begin():
            existing = session.scalar(select(Project.id).where(Project.code == DEMO_CODE))
            types = {c.code: c.id for c in session.scalars(select(Category))}
        if existing is not None:
            return None
        if not types:
            raise ValueError("types de produit absents : lancer `ffe db seed` d'abord")
        client = create_client(
            session, ClientCreate(name="Belvédère Hospitality", kind="company"), clock
        )
        silvera = create_supplier(
            session,
            SupplierCreate(
                name="Silvera",
                contact_name="Claire Martin",
                email="c.martin@example.com",
                phone="+33 1 00 00 00 00",
            ),
            clock,
        )
        atelier = create_supplier(
            session,
            SupplierCreate(name="Atelier Bois & Cie", contact_name="Paul Durand", currency="EUR"),
            clock,
        )
        project = create_project(
            session,
            ProjectCreate(
                name="Hôtel Le Belvédère — ouverture",
                client_id=client.id,
                code=DEMO_CODE,
                global_budget_cents=85_000_000,
            ),
            clock,
        )
        lobby = create_location(
            session,
            project.id,
            LocationCreate(code="LOB", name="Lobby", zone="Zones communes", level="R0"),
            clock,
        )
        bar = create_location(
            session,
            project.id,
            LocationCreate(code="BAR", name="Bar", zone="Zones communes", level="R0"),
            clock,
        )
        room = create_location(
            session,
            project.id,
            LocationCreate(
                code="CHA", name="Chambre typo A", zone="Hébergement", level="R+1", multiplier=24
            ),
            clock,
        )
        suite = create_location(
            session,
            project.id,
            LocationCreate(
                code="SUI", name="Junior suite", zone="Hébergement", level="R+3", multiplier=4
            ),
            clock,
        )
        put_budget_lines(
            session,
            project.id,
            BudgetLinesPut(
                lines=[
                    BudgetLineIn(scope="global", amount_cents=85_000_000),
                    BudgetLineIn(scope="zone", zone="Hébergement", amount_cents=50_000_000),
                    BudgetLineIn(scope="zone", zone="Zones communes", amount_cents=30_000_000),
                ]
            ),
            clock,
        )
        sofa = create_item(
            session,
            project.id,
            ProjectItemCreate(
                name="Canapé Sesann 3 places",
                category_id=types["AS"],
                supplier_id=silvera.id,
                reference="SESANN-3",
                family="edition",
                usage="indoor",
                finish="Velours vert, piètement chrome",
                dimensions="L 230 × P 95 × H 72 cm",
                source_url="https://example.com/sesann",
                unit_cost_cents=640_000,
                placements=[PlacementCreate(location_id=lobby.id, qty_milli=2000)],
            ),
            clock,
        )
        change_status(session, sofa.id, StatusChange(status="quoted"), clock)
        lamp = create_item(
            session,
            project.id,
            ProjectItemCreate(
                name="Lampe de chevet IC Lights T1",
                category_id=types["LUD"],
                supplier_id=silvera.id,
                reference="IC-T1-LOW",
                family="edition",
                usage="indoor",
                finish="Laiton brossé",
                dimensions="Ø 20 × H 38 cm",
                unit_cost_cents=38_500,
                quote_ref="DV-2026-118",
                quote_indice="A",
                placements=[
                    PlacementCreate(location_id=room.id, qty_milli=2000),
                    PlacementCreate(location_id=suite.id, qty_milli=3000),
                ],
            ),
            clock,
        )
        change_status(session, lamp.id, StatusChange(status="approved"), clock)
        create_item(
            session,
            project.id,
            ProjectItemCreate(
                name="Tête de lit sur-mesure chêne",
                category_id=types["LIT"],
                supplier_id=atelier.id,
                family="custom",
                finish="Chêne naturel huilé",
                dimensions="L 200 × H 120 cm",
                unit_cost_cents=185_000,
                add_to_catalogue=False,
                placements=[PlacementCreate(location_id=room.id, qty_milli=1000)],
            ),
            clock,
        )
        create_item(
            session,
            project.id,
            ProjectItemCreate(
                name="Tabouret de bar Pelleossa",
                category_id=types["TBR"],
                supplier_id=silvera.id,
                family="edition",
                dimensions="H 75 cm",
                unit_cost_cents=42_000,
                placements=[PlacementCreate(location_id=bar.id, qty_milli=8000)],
            ),
            clock,
        )
        create_item(
            session,
            project.id,
            ProjectItemCreate(
                kind="fee",
                name="Livraison et emballage",
                supplier_id=silvera.id,
                unit_cost_cents=120_000,
            ),
            clock,
        )
        return project
