from fastapi import APIRouter
from backend.services.panel import get_filter_options, get_respondent_count
from backend.models.respondent import FilterOptions

router = APIRouter(prefix="/api/respondents", tags=["respondents"])


@router.get("/filters", response_model=FilterOptions)
def filters():
    return get_filter_options()


@router.get("/count")
def count(
    role: str | None = None,
    org_size: str | None = None,
    industry: str | None = None,
    region: str | None = None,
    ai_usage_frequency: str | None = None,
    architecture_trend: str | None = None,
):
    filters = {}
    for key, val in [
        ("role", role), ("org_size", org_size), ("industry", industry),
        ("region", region), ("ai_usage_frequency", ai_usage_frequency),
        ("architecture_trend", architecture_trend),
    ]:
        if val:
            filters[key] = [v.strip() for v in val.split(",")]
    return {"count": get_respondent_count(filters or None)}
