import duckdb
from pathlib import Path
from backend.config import settings

_conn: duckdb.DuckDBPyConnection | None = None


def get_conn() -> duckdb.DuckDBPyConnection:
    global _conn
    if _conn is None:
        _conn = duckdb.connect(settings.duckdb_path)
    return _conn


def init_db() -> None:
    conn = get_conn()
    csv_path = Path(settings.csv_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    conn.execute("""
        CREATE TABLE IF NOT EXISTS respondents AS
        SELECT row_number() OVER () as id, *
        FROM read_csv_auto(?)
    """, [str(csv_path)])

    conn.execute("""
        CREATE TABLE IF NOT EXISTS debates (
            id VARCHAR PRIMARY KEY,
            question TEXT NOT NULL,
            panel_size INTEGER NOT NULL,
            num_rounds INTEGER NOT NULL,
            filters JSON,
            model VARCHAR NOT NULL,
            created_at TIMESTAMP DEFAULT current_timestamp
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS debate_messages (
            id VARCHAR PRIMARY KEY,
            debate_id VARCHAR NOT NULL REFERENCES debates(id),
            round_num INTEGER NOT NULL,
            respondent_id INTEGER NOT NULL,
            agent_name VARCHAR NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT current_timestamp
        )
    """)


def close_db() -> None:
    global _conn
    if _conn is not None:
        _conn.close()
        _conn = None
