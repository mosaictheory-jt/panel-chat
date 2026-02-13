from pydantic import BaseModel


class WSMessage(BaseModel):
    type: str  # "breakdown_complete" | "survey_response" | "survey_done" | "error"
    data: dict
