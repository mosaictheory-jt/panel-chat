from langgraph.graph import StateGraph, START, END
from langgraph.types import Send

from backend.graph.state import SurveyState, DebateState
from backend.graph.nodes import survey_respond, debate_respond, collect_round, analyze_debate
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
# Debate graph: discussion rounds -> collect (raw transcript) -> loop -> analyze -> END
# ---------------------------------------------------------------------------

def _build_raw_transcript(debate_messages: list[dict], up_to_round: int) -> str:
    """Build the full raw transcript of all debate messages up to (and including) a given round."""
    transcript_parts: list[str] = []
    for round_num in range(1, up_to_round + 1):
        round_msgs = [m for m in debate_messages if m.get("round") == round_num]
        if not round_msgs:
            continue
        transcript_parts.append(f"--- Round {round_num} ---")
        for msg in round_msgs:
            transcript_parts.append(f"{msg['agent_name']}: {msg['text']}")
        transcript_parts.append("")
    return "\n".join(transcript_parts).strip()


def _debate_fan_out(state: DebateState) -> list[Send]:
    """Fan out for an open-ended discussion round, passing full raw transcript."""
    panel = state["panel"]
    models = state["models"]
    api_keys = state["api_keys"]
    temperatures = state.get("temperatures", {})
    question = state["question"]
    survey_id = state["survey_id"]
    persona_memory = state.get("persona_memory", True)
    current_round = state["current_round"]
    num_rounds = state["num_rounds"]
    debate_messages = state.get("debate_messages", [])

    # Build the raw transcript of all prior rounds
    prior_transcript = _build_raw_transcript(debate_messages, current_round - 1)

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
                "question": question,
                "model": model,
                "api_key": api_key,
                "temperature": temp,
                "survey_id": survey_id,
                "persona_memory": persona_memory,
                "round_number": current_round,
                "num_rounds": num_rounds,
                "prior_transcript": prior_transcript,
            }))
    return sends


def build_debate_graph() -> StateGraph:
    """Multi-round debate: discussion -> collect -> loop -> analyze -> END."""
    graph = StateGraph(DebateState)

    graph.add_node("debate_respond", debate_respond)
    graph.add_node("collect_round", collect_round)
    graph.add_node("analyze_debate", analyze_debate)

    # START -> fan out for round 1
    graph.add_conditional_edges(START, _debate_fan_out, ["debate_respond"])

    # All debate responses -> collect (increments round counter)
    graph.add_edge("debate_respond", "collect_round")

    # After collect: if more rounds, fan out again; otherwise run analysis
    def _after_collect(state: DebateState) -> list[Send] | str:
        if state["current_round"] > state["num_rounds"]:
            return "analyze_debate"
        return _debate_fan_out(state)

    graph.add_conditional_edges(
        "collect_round",
        _after_collect,
        ["debate_respond", "analyze_debate"],
    )

    # Analysis -> END
    graph.add_edge("analyze_debate", END)

    return graph.compile()
