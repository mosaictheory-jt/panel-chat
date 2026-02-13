from pydantic import BaseModel


class WSMessage(BaseModel):
    type: str  # "agent_response" | "round_done" | "debate_done" | "error"
    data: dict
