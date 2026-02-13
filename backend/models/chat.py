from pydantic import BaseModel


class DebateRequest(BaseModel):
    question: str
    panel_size: int = 5
    num_rounds: int = 2
    filters: dict[str, list[str]] | None = None
    llm_provider: str | None = None


class AgentMessage(BaseModel):
    id: str
    debate_id: str
    round_num: int
    respondent_id: int
    agent_name: str
    content: str


class DebateSession(BaseModel):
    id: str
    question: str
    panel_size: int
    num_rounds: int
    filters: dict[str, list[str]] | None = None
    llm_provider: str
    panel: list[dict] = []
    messages: list[AgentMessage] = []
    created_at: str | None = None


class DebateSummary(BaseModel):
    id: str
    question: str
    panel_size: int
    num_rounds: int
    created_at: str | None = None
