from langgraph.graph import StateGraph, START, END
from langgraph.types import Send

from backend.graph.state import SurveyState, DebateState
from backend.graph.nodes import survey_respond, debate_respond, summarize_round
from backend.models.respondent import Respondent
from backend.services.llm import _detect_provider


def _fan_out(state: SurveyState) -> list[Send]:
    """Fan out: for each respondent x model, create a Send to survey_respond."""
    panel = state["panel"]
    models = state["models"]
    api_keys = state["api_keys"]
    temperatures = state.get("temperatures", {})
    sub_questions = state["sub_questions"]
    question = state["question"]
    survey_id = state["survey_id"]
    persona_memory = state.get("persona_memory", True)

    sends = []
    for respondent_dict in panel:
        respondent = Respondent(**respondent_dict)
        for model in models:
            provider = _detect_provider(model)
            api_key = api_keys.get(provider, "")
            if not api_key:
                continue
            temp = temperatures.get(model)
            sends.append(Send("survey_respond", {
                "respondent": respondent_dict,
                "agent_name": respondent.display_name(),
                "sub_questions": sub_questions,
                "question": question,
                "model": model,
                "api_key": api_key,
                "temperature": temp,
                "survey_id": survey_id,
                "persona_memory": persona_memory,
            }))
    return sends


def build_survey_graph() -> StateGraph:
    """Simple single fan-out graph: START -> fan_out -> survey_respond -> END."""
    graph = StateGraph(SurveyState)

    graph.add_node("survey_respond", survey_respond)

    # START -> fan out to all agent+model combos
    graph.add_conditional_edges(START, _fan_out, ["survey_respond"])
    # All responses -> END (no collect/loop needed)
    graph.add_edge("survey_respond", END)

    return graph.compile()


# ---------------------------------------------------------------------------
# Debate graph: discussion rounds -> summarize -> loop -> final vote -> END
# ---------------------------------------------------------------------------

def _debate_fan_out(state: DebateState) -> list[Send]:
    """Fan out for a debate round (discussion or final vote)."""
    panel = state["panel"]
    models = state["models"]
    api_keys = state["api_keys"]
    temperatures = state.get("temperatures", {})
    sub_questions = state["sub_questions"]
    question = state["question"]
    survey_id = state["survey_id"]
    persona_memory = state.get("persona_memory", True)
    current_round = state["current_round"]
    num_rounds = state["num_rounds"]
    prior_round_summary = state.get("prior_round_summary", "")

    sends = []
    for respondent_dict in panel:
        respondent = Respondent(**respondent_dict)
        for model in models:
            provider = _detect_provider(model)
            api_key = api_keys.get(provider, "")
            if not api_key:
                continue
            temp = temperatures.get(model)
            sends.append(Send("debate_respond", {
                "respondent": respondent_dict,
                "agent_name": respondent.display_name(),
                "sub_questions": sub_questions,
                "question": question,
                "model": model,
                "api_key": api_key,
                "temperature": temp,
                "survey_id": survey_id,
                "persona_memory": persona_memory,
                "round_number": current_round,
                "num_rounds": num_rounds,
                "prior_round_summary": prior_round_summary,
            }))
    return sends


def build_debate_graph() -> StateGraph:
    """Multi-round debate: discussion rounds -> summarize -> loop -> final vote -> END."""
    graph = StateGraph(DebateState)

    graph.add_node("debate_respond", debate_respond)
    graph.add_node("summarize_round", summarize_round)

    # START -> fan out for round 1
    graph.add_conditional_edges(START, _debate_fan_out, ["debate_respond"])

    # All debate responses -> summarize
    graph.add_edge("debate_respond", "summarize_round")

    # After summary: if more rounds needed fan out again, otherwise END
    def _after_summary(state: DebateState) -> list[Send] | str:
        if state["current_round"] > state["num_rounds"]:
            return END
        return _debate_fan_out(state)

    graph.add_conditional_edges(
        "summarize_round",
        _after_summary,
        ["debate_respond", END],
    )

    return graph.compile()
