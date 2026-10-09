"""Import boundaries of `src/ffe` (ARCHITECTURE §6), checked with `ast` only."""

import ast
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "src" / "ffe"

# package or module prefix → forbidden imports (module prefixes)
FORBIDDEN: dict[str, tuple[str, ...]] = {
    "ffe.money": ("ffe.", "sqlalchemy", "fastapi", "pydantic"),
    "ffe.models": ("ffe.schemas", "ffe.services", "ffe.api", "fastapi"),
    "ffe.schemas": ("ffe.services", "ffe.api", "sqlalchemy"),
    "ffe.services": ("ffe.api", "fastapi"),
    "ffe.api": ("ffe.models", "sqlalchemy"),
    "ffe.db": ("ffe.services", "ffe.api"),
}


def module_name(path: Path) -> str:
    rel = path.relative_to(SRC.parent).with_suffix("")
    parts = list(rel.parts)
    if parts[-1] == "__init__":
        parts.pop()
    return ".".join(parts)


def imports_of(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    found: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            found.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            found.add(node.module)
    return found


def test_import_boundaries() -> None:
    violations: list[str] = []
    for path in sorted(SRC.rglob("*.py")):
        name = module_name(path)
        for prefix, forbidden in FORBIDDEN.items():
            if name == prefix or name.startswith(prefix + "."):
                for imported in imports_of(path):
                    if any(imported == f or imported.startswith(f) for f in forbidden):
                        violations.append(f"{name} importe {imported}")
    assert violations == []


def test_models_only_use_strict_compatible_types() -> None:
    """`String` renders VARCHAR, which a STRICT table refuses: models use `Text` and `Integer`."""
    offenders: list[str] = []
    for path in sorted((SRC / "models").glob("*.py")):
        if "String" in imports_of(path) or "sqlalchemy.String" in imports_of(path):
            offenders.append(path.name)
        if "String(" in path.read_text(encoding="utf-8"):
            offenders.append(path.name)
    assert offenders == []
