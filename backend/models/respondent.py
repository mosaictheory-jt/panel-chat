from pydantic import BaseModel


class Respondent(BaseModel):
    id: int
    timestamp: str | None = None
    role: str | None = None
    org_size: str | None = None
    industry: str | None = None
    team_focus: str | None = None
    storage_environment: str | None = None
    orchestration: str | None = None
    ai_usage_frequency: str | None = None
    ai_helps_with: str | None = None
    ai_adoption: str | None = None
    modeling_approach: str | None = None
    modeling_pain_points: str | None = None
    architecture_trend: str | None = None
    biggest_bottleneck: str | None = None
    team_growth_2026: str | None = None
    education_topic: str | None = None
    industry_wish: str | None = None
    region: str | None = None

    def display_name(self) -> str:
        parts = [self.role or "Unknown"]
        if self.industry:
            parts.append(f"@ {self.industry}")
        extras = []
        if self.org_size:
            extras.append(self.org_size)
        if self.region:
            extras.append(self.region)
        if extras:
            parts.append(f"({', '.join(extras)})")
        return " ".join(parts)


class FilterOptions(BaseModel):
    role: list[str] = []
    org_size: list[str] = []
    industry: list[str] = []
    region: list[str] = []
    ai_usage_frequency: list[str] = []
    architecture_trend: list[str] = []


class FilterRequest(BaseModel):
    role: list[str] | None = None
    org_size: list[str] | None = None
    industry: list[str] | None = None
    region: list[str] | None = None
    ai_usage_frequency: list[str] | None = None
    architecture_trend: list[str] | None = None
