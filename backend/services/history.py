import json
import uuid
from backend.db import get_conn
from backend.models.chat import DebateSession, DebateSummary, AgentMessage


def create_debate(
    question: str,
    panel_size: int,
    num_rounds: int,
    filters: dict | None,
    model: str,
    panel: list[dict],
) -> DebateSession:
    conn = get_conn()
    debate_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO debates (id, question, panel_size, num_rounds, filters, model) VALUES (?, ?, ?, ?, ?, ?)",
        [debate_id, question, panel_size, num_rounds, json.dumps(filters), model],
    )
    return DebateSession(
        id=debate_id,
        question=question,
        panel_size=panel_size,
        num_rounds=num_rounds,
        filters=filters,
        model=model,
        panel=panel,
    )


def save_message(
    debate_id: str,
    round_num: int,
    respondent_id: int,
    agent_name: str,
    content: str,
) -> AgentMessage:
    conn = get_conn()
    msg_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO debate_messages (id, debate_id, round_num, respondent_id, agent_name, content) VALUES (?, ?, ?, ?, ?, ?)",
        [msg_id, debate_id, round_num, respondent_id, agent_name, content],
    )
    return AgentMessage(
        id=msg_id,
        debate_id=debate_id,
        round_num=round_num,
        respondent_id=respondent_id,
        agent_name=agent_name,
        content=content,
    )


def list_debates() -> list[DebateSummary]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, question, panel_size, num_rounds, created_at FROM debates ORDER BY created_at DESC"
    ).fetchall()
    return [
        DebateSummary(
            id=r[0], question=r[1], panel_size=r[2], num_rounds=r[3],
            created_at=str(r[4]) if r[4] else None,
        )
        for r in rows
    ]


def get_debate(debate_id: str) -> DebateSession | None:
    conn = get_conn()
    row = conn.execute(
        "SELECT id, question, panel_size, num_rounds, filters, model, created_at FROM debates WHERE id = ?",
        [debate_id],
    ).fetchone()
    if not row:
        return None
    messages_rows = conn.execute(
        "SELECT id, debate_id, round_num, respondent_id, agent_name, content FROM debate_messages WHERE debate_id = ? ORDER BY round_num, created_at",
        [debate_id],
    ).fetchall()
    messages = [
        AgentMessage(id=m[0], debate_id=m[1], round_num=m[2], respondent_id=m[3], agent_name=m[4], content=m[5])
        for m in messages_rows
    ]
    filters = json.loads(row[4]) if row[4] else None
    return DebateSession(
        id=row[0], question=row[1], panel_size=row[2], num_rounds=row[3],
        filters=filters, model=row[5],
        messages=messages, created_at=str(row[6]) if row[6] else None,
    )
