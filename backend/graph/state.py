import operator
from typing import Annotated, TypedDict


class AgentState(TypedDict):
    respondent: dict
    agent_name: str
    question: str
    round_num: int
    previous_responses: str
    model: str
    api_key: str


class DebateState(TypedDict):
    question: str
    panel: list[dict]
    num_rounds: int
    current_round: int
    model: str
    api_key: str
    round_responses: Annotated[list[dict], operator.add]
    all_rounds: list[list[dict]]
    debate_id: str
