from pydantic import BaseModel


class AgentMessage(BaseModel):
    """Used for WS event streaming."""
    id: str | None = None
    survey_id: str
    respondent_id: int
    agent_name: str
    model: str
    answers: dict[str, str]
