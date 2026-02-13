from backend.db import get_conn
from backend.models.respondent import Respondent, FilterOptions

FILTERABLE_COLUMNS = ["role", "org_size", "industry", "region", "ai_usage_frequency", "architecture_trend"]


def get_filter_options() -> FilterOptions:
    conn = get_conn()
    options: dict[str, list[str]] = {}
    for col in FILTERABLE_COLUMNS:
        rows = conn.execute(
            f"SELECT DISTINCT {col} FROM respondents WHERE {col} IS NOT NULL AND {col} != '' ORDER BY {col}"
        ).fetchall()
        options[col] = [r[0] for r in rows]
    return FilterOptions(**options)


def get_respondent_count(filters: dict[str, list[str]] | None = None) -> int:
    conn = get_conn()
    where, params = _build_where(filters)
    result = conn.execute(f"SELECT COUNT(*) FROM respondents {where}", params).fetchone()
    return result[0] if result else 0


def select_panel(panel_size: int, filters: dict[str, list[str]] | None = None) -> list[Respondent]:
    conn = get_conn()
    where, params = _build_where(filters)
    query = f"""
        SELECT * FROM respondents {where}
        USING SAMPLE {panel_size} ROWS
    """
    rows = conn.execute(query, params).fetchall()
    columns = [desc[0] for desc in conn.description]
    return [Respondent(**dict(zip(columns, row))) for row in rows]


def _build_where(filters: dict[str, list[str]] | None) -> tuple[str, list]:
    if not filters:
        return "", []
    clauses = []
    params = []
    for col, values in filters.items():
        if values and col in FILTERABLE_COLUMNS:
            placeholders = ", ".join(["?"] * len(values))
            clauses.append(f"{col} IN ({placeholders})")
            params.extend(values)
    if not clauses:
        return "", []
    return "WHERE " + " AND ".join(clauses), params
