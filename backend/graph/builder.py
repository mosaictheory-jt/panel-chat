from langgraph.graph import StateGraph, START, END
from langgraph.types import Send

from backend.graph.state import DebateState
from backend.graph.nodes import agent_respond, collect_round
from backend.models.respondent import Respondent


def _format_previous_responses(all_rounds: list[list[dict]]) -> str:
    lines = []
    for round_responses in all_rounds:
        for resp in round_responses:
            lines.append(f"**{resp['agent_name']}**: {resp['content']}")
    return "\n\n---\n\n".join(lines)


def _fan_out(state: DebateState) -> list[Send]:
    question = state["question"]
    panel = state["panel"]
    current_round = state["current_round"]
    all_rounds = state.get("all_rounds") or []
    model = state["model"]
    api_key = state["api_key"]

    previous_responses = _format_previous_responses(all_rounds) if all_rounds else ""

    sends = []
    for respondent_dict in panel:
        respondent = Respondent(**respondent_dict)
        sends.append(Send("agent_respond", {
            "respondent": respondent_dict,
            "agent_name": respondent.display_name(),
            "question": question,
            "round_num": current_round + 1,
            "previous_responses": previous_responses,
            "model": model,
            "api_key": api_key,
        }))
    return sends


def continue_or_finish(state: DebateState) -> list[Send] | str:
    """After collecting a round, either fan out again or finish."""
    if state["current_round"] >= state["num_rounds"]:
        return END
    return _fan_out(state)


def build_debate_graph() -> StateGraph:
    graph = StateGraph(DebateState)

    graph.add_node("agent_respond", agent_respond)
    graph.add_node("collect_round", collect_round)

    # START -> fan out to all agents
    graph.add_conditional_edges(START, _fan_out, ["agent_respond"])
    # All agent responses -> collect
    graph.add_edge("agent_respond", "collect_round")
    # After collecting, either fan out again or finish
    graph.add_conditional_edges("collect_round", continue_or_finish, ["agent_respond", END])

    return graph.compile()
