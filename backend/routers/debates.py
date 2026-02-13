from fastapi import APIRouter, HTTPException
from backend.models.chat import DebateRequest, DebateSession, DebateSummary
from backend.services.panel import select_panel
from backend.services.history import create_debate, list_debates, get_debate

router = APIRouter(prefix="/api/debates", tags=["debates"])


@router.post("", response_model=DebateSession)
def create(req: DebateRequest):
    panel = select_panel(req.panel_size, req.filters)
    panel_dicts = [r.model_dump() for r in panel]
    session = create_debate(
        question=req.question,
        panel_size=req.panel_size,
        num_rounds=req.num_rounds,
        filters=req.filters,
        model=req.model,
        panel=panel_dicts,
    )
    session.panel = panel_dicts
    return session


@router.get("", response_model=list[DebateSummary])
def list_all():
    return list_debates()


@router.get("/{debate_id}", response_model=DebateSession)
def get_by_id(debate_id: str):
    session = get_debate(debate_id)
    if not session:
        raise HTTPException(status_code=404, detail="Debate not found")
    return session
