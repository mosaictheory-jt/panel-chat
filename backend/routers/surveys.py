import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.models.survey import (
    SurveyRequest,
    SurveySession,
    SurveySummary,
    QuestionBreakdown,
)
from backend.services.panel import select_panel
from backend.services.history import (
    create_survey,
    list_surveys,
    get_survey,
    update_breakdown,
)
from backend.services.analyzer import analyze_question

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/surveys", tags=["surveys"])


class AnalyzeRequest(BaseModel):
    model: str
    api_key: str


class BreakdownSubmission(BaseModel):
    breakdown: QuestionBreakdown


@router.post("", response_model=SurveySession)
def create(req: SurveyRequest):
    panel = select_panel(req.panel_size, req.filters)
    panel_dicts = [r.model_dump() for r in panel]
    session = create_survey(
        question=req.question,
        panel_size=req.panel_size,
        filters=req.filters,
        models=req.models,
        panel=panel_dicts,
    )
    session.panel = panel_dicts
    return session


@router.post("/{survey_id}/analyze", response_model=QuestionBreakdown)
async def analyze(survey_id: str, req: AnalyzeRequest):
    session = get_survey(survey_id)
    if not session:
        raise HTTPException(status_code=404, detail="Survey not found")

    breakdown = await analyze_question(
        question=session.question,
        model=req.model,
        api_key=req.api_key,
    )
    update_breakdown(survey_id, breakdown)
    return breakdown


@router.post("/{survey_id}/breakdown", response_model=QuestionBreakdown)
def submit_breakdown(survey_id: str, req: BreakdownSubmission):
    session = get_survey(survey_id)
    if not session:
        raise HTTPException(status_code=404, detail="Survey not found")
    update_breakdown(survey_id, req.breakdown)
    return req.breakdown


@router.get("", response_model=list[SurveySummary])
def list_all():
    return list_surveys()


@router.get("/{survey_id}", response_model=SurveySession)
def get_by_id(survey_id: str):
    session = get_survey(survey_id)
    if not session:
        raise HTTPException(status_code=404, detail="Survey not found")
    return session
