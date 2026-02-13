import operator
from typing import Annotated, TypedDict


class AgentState(TypedDict):
    respondent: dict
    agent_name: str
    question: str
    round_num: int
    previous_responses: str
    llm_provider: str


class DebateState(TypedDict):
    question: str
    panel: list[dict]
    num_rounds: int
    current_round: int
    llm_provider: str
    round_responses: Annotated[list[dict], operator.add]
    all_rounds: list[list[dict]]
    debate_id: str
