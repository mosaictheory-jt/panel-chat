import logging
import threading

import duckdb
from pathlib import Path
from backend.config import settings

logger = logging.getLogger(__name__)

_conn: duckdb.DuckDBPyConnection | None = None
_lock = threading.Lock()


def get_conn() -> duckdb.DuckDBPyConnection:
    global _conn
    with _lock:
        if _conn is None:
            _conn = duckdb.connect(settings.duckdb_path)
        return _conn


def execute_query(query: str, params: list | None = None) -> duckdb.DuckDBPyConnection:
    """Thread-safe query execution using a cursor."""
    conn = get_conn()
    with _lock:
        cursor = conn.cursor()
    if params:
        return cursor.execute(query, params)
    return cursor.execute(query)


def init_db() -> None:
    conn = get_conn()
    csv_path = Path(settings.csv_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    with _lock:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS respondents AS
            SELECT row_number() OVER () as id, *
            FROM read_csv_auto(?)
        """, [str(csv_path)])

        conn.execute("""
            CREATE TABLE IF NOT EXISTS surveys (
                id VARCHAR PRIMARY KEY,
                question TEXT NOT NULL,
                breakdown JSON,
                panel_size INTEGER NOT NULL,
                filters JSON,
                models JSON NOT NULL,
                panel JSON,
                created_at TIMESTAMP DEFAULT current_timestamp
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS survey_responses (
                id VARCHAR PRIMARY KEY,
                survey_id VARCHAR NOT NULL REFERENCES surveys(id),
                respondent_id INTEGER NOT NULL,
                agent_name VARCHAR NOT NULL,
                model VARCHAR NOT NULL,
                answers JSON NOT NULL,
                created_at TIMESTAMP DEFAULT current_timestamp
            )
        """)

        # Add debate columns to existing surveys table (safe to re-run)
        for col_name in ("chat_mode", "debate_messages", "round_summaries", "debate_analysis"):
            try:
                conn.execute(f"ALTER TABLE surveys ADD COLUMN {col_name} JSON")
            except duckdb.CatalogException:
                pass  # column already exists

    count = execute_query("SELECT COUNT(*) FROM respondents").fetchone()
    logger.info("Database initialized with %d respondents", count[0] if count else 0)


def close_db() -> None:
    global _conn
    with _lock:
        if _conn is not None:
            _conn.close()
            _conn = None
