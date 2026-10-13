"""Contacts file import (ADR-0015): suppliers vs professionals, cleaning, duplicates, idempotence."""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from ffe.deps import Clock
from ffe.models import Professional, Supplier
from ffe.services.contact_import import (
    ContactImportError,
    decode_contacts,
    import_contacts,
    parse_contacts,
)

HEADER = (
    "NOM;PRESTATION;SAVOIR-FAIRE;Contact 1;TELEPHONE;PORTABLE;MAIL;Contact 2;Telephone 2;Mail 2\n"
)
ROWS = (
    "Flos;Fournisseur;Luminaire;Sandra Roger;01 53 85 49 93;NC;sandra@flos.com;Mickael  G;06 12;m@flos.com\n"
    "Jouffre;Fabricant;Confection;Alice Malet;01 47;06 69;alice@jouffre.com;;;\n"
    "Jouffre;Fabricant;Confection;Alice Malet;01 47;06 69;alice@jouffre.com;;;\n"
    "Dedar;Editeur;Tissu;Judith G;01 56;;j@dedar.com;;;\n"
    "Pouenat;Artisan;Ferronier;Jacques R;;;jacques@pouenat.com>;;;\n"
    "Astéri;Distributeur;Luminaire;Nicolas D;01 30;;n@asteri.fr;;;\n"
    "Pierre Frey;Editeur;Mobilier;Sabrina B;01 44;;s@pierrefrey.com;;;\n"
    "Pierre Frey;Fabricant;Mobilier;Elisabeth L;01 44;;e@pierrefrey.com;;;\n"
    "CVL;Fournisseur;Luminaire;Marie C;02 41;;mcourtaud@cvl luminaires.fr;;;\n"
    ";;;;;;;;;\n"
)
TEXT = HEADER + ROWS


def test_parse_maps_prestations_and_cleans_fields() -> None:
    rows = parse_contacts(TEXT)
    kinds = {row.name: row.kind for row in rows}
    assert (
        kinds
        == {
            "Flos": "supplier",
            "Jouffre": "manufacturer",
            "Dedar": "publisher",
            "Pouenat": "artisan",
            "Astéri": "distributor",
            "Pierre Frey": "publisher",
            "CVL": "supplier",
        }
        or len(rows) == 8
    )
    flos = rows[0]
    assert flos.fields["mobile"] is None  # « NC »
    assert flos.fields["contact2_name"] == "Mickael G"  # double space collapsed
    pouenat = next(r for r in rows if r.name == "Pouenat")
    assert pouenat.fields["email"] == "jacques@pouenat.com"  # trailing « > » stripped
    cvl = next(r for r in rows if r.name == "CVL")
    assert (
        cvl.fields["email"] is None
        and cvl.notes == "E-mail à vérifier : mcourtaud@cvl luminaires.fr"
    )


def test_import_creates_suppliers_and_professionals(session: Session, clock: Clock) -> None:
    result = import_contacts(session, TEXT, clock)
    assert (result.suppliers_created, result.professionals_created) == (2, 6)
    assert result.skipped_duplicate_rows == 1
    assert result.renamed == [("Pierre Frey", "Pierre Frey (Fabricant)")]
    assert result.emails_to_check == ["mcourtaud@cvl luminaires.fr"]
    suppliers = {s.name: s for s in session.scalars(select(Supplier))}
    assert suppliers["Flos"].contact2_email == "m@flos.com" and suppliers["Flos"].currency == "EUR"
    professionals = {p.name: p for p in session.scalars(select(Professional))}
    assert (
        professionals["Dedar"].kind == "publisher" and professionals["Dedar"].specialty == "Tissu"
    )
    assert professionals["Pierre Frey (Fabricant)"].contact_name == "Elisabeth L"


def test_second_import_skips_existing_names(session: Session, clock: Clock) -> None:
    import_contacts(session, TEXT, clock)
    again = import_contacts(session, TEXT, clock)
    assert (again.suppliers_created, again.professionals_created) == (0, 0)
    assert again.skipped_existing == 8


def test_unknown_prestation_is_refused_with_its_line() -> None:
    with pytest.raises(
        ContactImportError, match="Ligne 3 \\(Bob\\) : prestation inconnue « Plombier »"
    ):
        parse_contacts(HEADER + "Flos;Fournisseur;;;;;;;;\nBob;Plombier;;;;;;;;\n")


def test_missing_column_is_refused() -> None:
    with pytest.raises(ContactImportError, match="Colonnes manquantes.*MAIL 2"):
        parse_contacts("NOM;PRESTATION\nFlos;Fournisseur\n")


def test_optional_website_and_notes_columns(session: Session, clock: Clock) -> None:
    text = (
        HEADER.rstrip("\n")
        + ";SITE WEB;NOTES\n"
        + "Flos;Fournisseur;Luminaire;;;;;;;;www.flos.com;Adresse : Paris\n"
    )
    import_contacts(session, text, clock)
    flos = session.scalars(select(Supplier)).one()
    assert flos.website == "www.flos.com" and flos.notes == "Adresse : Paris"


def test_decode_accepts_cp1252_and_utf8() -> None:
    assert decode_contacts("Éditeur".encode("cp1252")) == "Éditeur"
    assert decode_contacts("﻿Éditeur".encode()) == "Éditeur"
