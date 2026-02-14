from pydantic import BaseModel, Field


class SubQuestion(BaseModel):
    id: str = Field(description="Short unique ID like sq_1, sq_2, etc.")
    text: str = Field(description="The sub-question text, concise and clear")
    answer_options: list[str] = Field(description="3-6 mutually exclusive categorical answer options")
    chart_type: str = Field(default="bar", description="Chart type: 'bar' for ordinal/ranked data, 'pie' for nominal/categorical data")


class QuestionBreakdown(BaseModel):
    original_question: str = Field(description="The user's original question, repeated verbatim")
    sub_questions: list[SubQuestion] = Field(description="1-6 sub-questions with categorical answer options. Use exactly 1 if the input is a single question.")


# ---------------------------------------------------------------------------
# Debate analysis — thematic extraction via structured LLM output
# ---------------------------------------------------------------------------

class DebateTheme(BaseModel):
    label: str = Field(description="Short descriptive label for this position cluster, e.g. 'Pro-AI Pragmatists'")
    description: str = Field(description="2-3 sentence summary of what this group believes and why")
    respondent_ids: list[int] = Field(description="IDs of respondents who hold this position")
    key_arguments: list[str] = Field(description="3-5 bullet-point arguments or quotes representative of this cluster")
    sentiment: str = Field(description="Overall sentiment: 'positive', 'negative', 'mixed', or 'neutral'")


class DebateAnalysis(BaseModel):
    themes: list[DebateTheme] = Field(description="Distinct position clusters identified in the debate, ordered by size (largest first)")
    consensus_points: list[str] = Field(description="Key points most or all panelists agree on")
    key_tensions: list[str] = Field(description="Main disagreements or fault lines in the group")
    synthesis: str = Field(description="3-5 sentence overall synthesis of the debate outcome")


class SurveyRequest(BaseModel):
    question: str
    panel_size: int = 5
    filters: dict[str, list[str]] | None = None
    models: list[str]
    analyzer_model: str


class SurveyRunRequest(BaseModel):
    survey_id: str
    breakdown: QuestionBreakdown


class SurveyResponse(BaseModel):
    id: str
    survey_id: str
    respondent_id: int
    agent_name: str
    model: str
    answers: dict[str, str]  # sub_question_id -> chosen option


class SurveySession(BaseModel):
    id: str
    question: str
    breakdown: QuestionBreakdown | None = None
    panel_size: int
    filters: dict[str, list[str]] | None = None
    models: list[str]
    panel: list[dict] = []
    responses: list[SurveyResponse] = []
    created_at: str | None = None


class SurveySummary(BaseModel):
    id: str
    question: str
    panel_size: int
    created_at: str | None = None
