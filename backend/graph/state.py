import operator
from typing import Annotated, TypedDict


class SurveyAgentState(TypedDict):
    respondent: dict
    agent_name: str
    sub_questions: list[dict]
    question: str
    model: str
    api_key: str
    temperature: float | None
    survey_id: str
    persona_memory: bool


class SurveyState(TypedDict):
    question: str
    sub_questions: list[dict]
    panel: list[dict]
    models: list[str]
    api_keys: dict[str, str]  # provider -> key
    temperatures: dict[str, float]  # model -> temperature
    survey_id: str
    persona_memory: bool
    responses: Annotated[list[dict], operator.add]


class DebateAgentState(TypedDict):
    respondent: dict
    agent_name: str
    question: str
    model: str
    api_key: str
    temperature: float | None
    survey_id: str
    persona_memory: bool
    round_number: int
    num_rounds: int
    prior_round_summary: str


class DebateState(TypedDict):
    question: str
    panel: list[dict]
    models: list[str]
    api_keys: dict[str, str]
    temperatures: dict[str, float]
    survey_id: str
    persona_memory: bool
    num_rounds: int
    current_round: int
    prior_round_summary: str
    debate_messages: Annotated[list[dict], operator.add]
    analysis: dict | None
