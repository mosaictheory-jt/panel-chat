import operator
from typing import Annotated, TypedDict


class SurveyAgentState(TypedDict):
    respondent: dict
    agent_name: str
    sub_questions: list[dict]
    question: str
    model: str
    api_key: str
    survey_id: str


class SurveyState(TypedDict):
    question: str
    sub_questions: list[dict]
    panel: list[dict]
    models: list[str]
    api_keys: dict[str, str]  # provider -> key
    survey_id: str
    responses: Annotated[list[dict], operator.add]
