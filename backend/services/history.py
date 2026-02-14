import json
import uuid
from backend.db import execute_query
from backend.models.survey import (
    SurveySession,
    SurveySummary,
    SurveyResponse,
    QuestionBreakdown,
)


def create_survey(
    question: str,
    panel_size: int,
    filters: dict | None,
    models: list[str],
    panel: list[dict],
) -> SurveySession:
    survey_id = str(uuid.uuid4())
    execute_query(
        "INSERT INTO surveys (id, question, panel_size, filters, models, panel) VALUES (?, ?, ?, ?, ?, ?)",
        [survey_id, question, panel_size, json.dumps(filters), json.dumps(models), json.dumps(panel)],
    )
    return SurveySession(
        id=survey_id,
        question=question,
        panel_size=panel_size,
        filters=filters,
        models=models,
        panel=panel,
    )


def update_breakdown(survey_id: str, breakdown: QuestionBreakdown) -> None:
    execute_query(
        "UPDATE surveys SET breakdown = ? WHERE id = ?",
        [breakdown.model_dump_json(), survey_id],
    )


def save_response(
    survey_id: str,
    respondent_id: int,
    agent_name: str,
    model: str,
    answers: dict[str, str],
) -> SurveyResponse:
    resp_id = str(uuid.uuid4())
    execute_query(
        "INSERT INTO survey_responses (id, survey_id, respondent_id, agent_name, model, answers) VALUES (?, ?, ?, ?, ?, ?)",
        [resp_id, survey_id, respondent_id, agent_name, model, json.dumps(answers)],
    )
    return SurveyResponse(
        id=resp_id,
        survey_id=survey_id,
        respondent_id=respondent_id,
        agent_name=agent_name,
        model=model,
        answers=answers,
    )


def get_respondent_history(respondent_id: int, exclude_survey_id: str | None = None) -> list[dict]:
    """Retrieve a respondent's past survey answers for persona memory.

    Returns a list of dicts: [{ question, answers: {sq_id: answer}, sub_questions: [...] }]
    """
    query = """
        SELECT s.question, s.breakdown, sr.answers
        FROM survey_responses sr
        JOIN surveys s ON sr.survey_id = s.id
        WHERE sr.respondent_id = ?
    """
    params: list = [respondent_id]

    if exclude_survey_id:
        query += " AND sr.survey_id != ?"
        params.append(exclude_survey_id)

    query += " ORDER BY sr.created_at ASC"

    rows = execute_query(query, params).fetchall()
    history = []
    for row in rows:
        question = row[0]
        breakdown_raw = row[1]
        answers_raw = row[2]

        answers = json.loads(answers_raw) if isinstance(answers_raw, str) else (answers_raw or {})
        breakdown = json.loads(breakdown_raw) if isinstance(breakdown_raw, str) else breakdown_raw

        sub_questions = []
        if breakdown and "sub_questions" in breakdown:
            sub_questions = breakdown["sub_questions"]

        history.append({
            "question": question,
            "answers": answers,
            "sub_questions": sub_questions,
        })
    return history


def list_surveys() -> list[SurveySummary]:
    rows = execute_query(
        "SELECT id, question, panel_size, created_at FROM surveys ORDER BY created_at DESC"
    ).fetchall()
    return [
        SurveySummary(
            id=r[0], question=r[1], panel_size=r[2],
            created_at=str(r[3]) if r[3] else None,
        )
        for r in rows
    ]


def get_survey(survey_id: str) -> SurveySession | None:
    row = execute_query(
        "SELECT id, question, breakdown, panel_size, filters, models, panel, created_at FROM surveys WHERE id = ?",
        [survey_id],
    ).fetchone()
    if not row:
        return None

    response_rows = execute_query(
        "SELECT id, survey_id, respondent_id, agent_name, model, answers FROM survey_responses WHERE survey_id = ? ORDER BY created_at",
        [survey_id],
    ).fetchall()

    responses = [
        SurveyResponse(
            id=r[0], survey_id=r[1], respondent_id=r[2],
            agent_name=r[3], model=r[4],
            answers=json.loads(r[5]) if isinstance(r[5], str) else r[5],
        )
        for r in response_rows
    ]

    breakdown_raw = row[2]
    breakdown = None
    if breakdown_raw:
        breakdown_data = json.loads(breakdown_raw) if isinstance(breakdown_raw, str) else breakdown_raw
        breakdown = QuestionBreakdown(**breakdown_data)

    filters_raw = row[4]
    filters = json.loads(filters_raw) if isinstance(filters_raw, str) else filters_raw

    models_raw = row[5]
    models = json.loads(models_raw) if isinstance(models_raw, str) else models_raw

    panel_raw = row[6]
    panel = json.loads(panel_raw) if isinstance(panel_raw, str) else (panel_raw or [])

    return SurveySession(
        id=row[0],
        question=row[1],
        breakdown=breakdown,
        panel_size=row[3],
        filters=filters,
        models=models,
        panel=panel,
        responses=responses,
        created_at=str(row[7]) if row[7] else None,
    )
