from langgraph.graph import StateGraph, START, END
from langgraph.types import Send

from backend.graph.state import SurveyState
from backend.graph.nodes import survey_respond
from backend.models.respondent import Respondent
from backend.services.llm import _detect_provider


def _fan_out(state: SurveyState) -> list[Send]:
    """Fan out: for each respondent x model, create a Send to survey_respond."""
    panel = state["panel"]
    models = state["models"]
    api_keys = state["api_keys"]
    sub_questions = state["sub_questions"]
    question = state["question"]
    survey_id = state["survey_id"]

    sends = []
    for respondent_dict in panel:
        respondent = Respondent(**respondent_dict)
        for model in models:
            provider = _detect_provider(model)
            api_key = api_keys.get(provider, "")
            if not api_key:
                continue
            sends.append(Send("survey_respond", {
                "respondent": respondent_dict,
                "agent_name": respondent.display_name(),
                "sub_questions": sub_questions,
                "question": question,
                "model": model,
                "api_key": api_key,
                "survey_id": survey_id,
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
