import json
import logging

from langchain_core.messages import SystemMessage, HumanMessage
from backend.graph.state import SurveyAgentState, DebateAgentState, DebateState
from backend.graph.prompts import (
    PERSONA_SYSTEM,
    PERSONA_MEMORY_BLOCK,
    SURVEY_USER,
    DEBATE_DISCUSS_USER,
    DEBATE_DISCUSS_FOLLOWUP_USER,
    DEBATE_SUMMARY_SYSTEM,
    DEBATE_SUMMARY_USER,
    DEBATE_ANALYSIS_SYSTEM,
    DEBATE_ANALYSIS_USER,
)
from backend.models.survey import DebateAnalysis
from backend.services.llm import get_llm
from backend.services.history import get_respondent_history

logger = logging.getLogger(__name__)


def _format_sub_questions(sub_questions: list[dict]) -> str:
    """Format sub-questions into a readable text block for the LLM prompt."""
    lines = []
    for sq in sub_questions:
        options_str = ", ".join(f'"{opt}"' for opt in sq["answer_options"])
        lines.append(f'- {sq["id"]}: {sq["text"]}\n  Options: [{options_str}]')
    return "\n".join(lines)


def _format_history(history: list[dict]) -> str:
    """Format past survey answers into a readable memory block."""
    if not history:
        return ""

    sections = []
    for i, entry in enumerate(history, 1):
        question = entry["question"]
        answers = entry["answers"]
        sub_questions = entry.get("sub_questions", [])

        sq_lookup = {sq["id"]: sq["text"] for sq in sub_questions}

        answer_lines = []
        for sq_id, answer in answers.items():
            sq_text = sq_lookup.get(sq_id, sq_id)
            answer_lines.append(f"  - {sq_text}: **{answer}**")

        section = f"**Survey {i}**: \"{question}\"\n" + "\n".join(answer_lines)
        sections.append(section)

    history_text = "\n\n".join(sections)

    return PERSONA_MEMORY_BLOCK.format(history_text=history_text)


def _build_system_prompt(respondent: dict, survey_id: str, persona_memory: bool) -> str:
    """Build the persona system prompt, optionally including memory."""
    memory_block = ""
    if persona_memory:
        respondent_id = respondent["id"]
        history = get_respondent_history(respondent_id, exclude_survey_id=survey_id)
        if history:
            logger.info(
                "Persona %d has %d past surveys in memory",
                respondent_id, len(history),
            )
            memory_block = _format_history(history)

    return PERSONA_SYSTEM.format(
        role=respondent.get("role", "Unknown"),
        org_size=respondent.get("org_size", "Unknown"),
        industry=respondent.get("industry", "Unknown"),
        team_focus=respondent.get("team_focus", "Unknown"),
        storage_environment=respondent.get("storage_environment", "Unknown"),
        orchestration=respondent.get("orchestration", "Unknown"),
        ai_usage_frequency=respondent.get("ai_usage_frequency", "Unknown"),
        ai_helps_with=respondent.get("ai_helps_with", "Unknown"),
        ai_adoption=respondent.get("ai_adoption", "Unknown"),
        modeling_approach=respondent.get("modeling_approach", "Unknown"),
        modeling_pain_points=respondent.get("modeling_pain_points", "Unknown"),
        architecture_trend=respondent.get("architecture_trend", "Unknown"),
        biggest_bottleneck=respondent.get("biggest_bottleneck", "Unknown"),
        team_growth_2026=respondent.get("team_growth_2026", "Unknown"),
        education_topic=respondent.get("education_topic", "Unknown"),
        industry_wish=respondent.get("industry_wish", "Unknown"),
        region=respondent.get("region", "Unknown"),
        memory_block=memory_block,
    )


def _extract_token_usage(response) -> dict | None:
    """Extract token usage from LLM response metadata."""
    token_usage = None
    usage_meta = getattr(response, "usage_metadata", None)
    if usage_meta:
        input_tok = usage_meta.get("input_tokens", 0) if isinstance(usage_meta, dict) else getattr(usage_meta, "input_tokens", 0)
        output_tok = usage_meta.get("output_tokens", 0) if isinstance(usage_meta, dict) else getattr(usage_meta, "output_tokens", 0)
        token_usage = {
            "input_tokens": input_tok or 0,
            "output_tokens": output_tok or 0,
        }
    elif hasattr(response, "response_metadata"):
        meta = response.response_metadata or {}
        usage = meta.get("usage") or meta.get("token_usage") or {}
        if usage:
            token_usage = {
                "input_tokens": usage.get("input_tokens") or usage.get("prompt_tokens") or 0,
                "output_tokens": usage.get("output_tokens") or usage.get("completion_tokens") or 0,
            }
    return token_usage


def _get_summary_llm(state: DebateState):
    """Find the first model with a valid API key for summarization."""
    from backend.services.llm import _detect_provider
    models = state["models"]
    api_keys = state["api_keys"]
    temperatures = state.get("temperatures", {})

    for candidate_model in models:
        provider = _detect_provider(candidate_model)
        candidate_key = api_keys.get(provider, "")
        if candidate_key:
            temperature = temperatures.get(candidate_model)
            return get_llm(candidate_model, candidate_key, temperature=temperature)
    return None


def _parse_answers(content: str, sub_questions: list[dict]) -> dict[str, str]:
    """Extract the JSON answer dict from LLM response, with fallback parsing."""
    text = content.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [line for line in lines if not line.strip().startswith("```")]
        text = "\n".join(lines).strip()

    try:
        answers = json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the response
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            try:
                answers = json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                logger.warning("Failed to parse LLM response as JSON: %s", text[:200])
                answers = {sq["id"]: sq["answer_options"][0] for sq in sub_questions}
        else:
            logger.warning("No JSON found in LLM response: %s", text[:200])
            answers = {sq["id"]: sq["answer_options"][0] for sq in sub_questions}

    # Validate answers against valid options
    valid_answers: dict[str, str] = {}
    sq_lookup = {sq["id"]: sq for sq in sub_questions}
    for sq_id, sq_data in sq_lookup.items():
        chosen = answers.get(sq_id, sq_data["answer_options"][0])
        if chosen not in sq_data["answer_options"]:
            logger.warning("Invalid answer '%s' for %s, using first option", chosen, sq_id)
            chosen = sq_data["answer_options"][0]
        valid_answers[sq_id] = chosen

    return valid_answers


# ---------------------------------------------------------------------------
# Survey mode: single fan-out, structured answers
# ---------------------------------------------------------------------------

def survey_respond(state: SurveyAgentState) -> dict:
    """Each persona answers the structured sub-questions."""
    respondent = state["respondent"]
    agent_name = state["agent_name"]
    sub_questions = state["sub_questions"]
    question = state["question"]
    model = state["model"]
    api_key = state["api_key"]
    temperature = state.get("temperature")
    survey_id = state["survey_id"]
    persona_memory = state.get("persona_memory", True)

    system_prompt = _build_system_prompt(respondent, survey_id, persona_memory)

    user_prompt = SURVEY_USER.format(
        question=question,
        sub_questions_text=_format_sub_questions(sub_questions),
    )

    llm = get_llm(model, api_key, temperature=temperature)
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ])

    answers = _parse_answers(response.content, sub_questions)
    token_usage = _extract_token_usage(response)

    return {
        "responses": [{
            "respondent_id": respondent["id"],
            "agent_name": agent_name,
            "model": model,
            "answers": answers,
            "token_usage": token_usage,
        }]
    }


# ---------------------------------------------------------------------------
# Debate mode: all rounds are open-ended discussion, then thematic analysis
# ---------------------------------------------------------------------------

def debate_respond(state: DebateAgentState) -> dict:
    """Persona participates in an open-ended discussion round."""
    respondent = state["respondent"]
    agent_name = state["agent_name"]
    question = state["question"]
    model = state["model"]
    api_key = state["api_key"]
    temperature = state.get("temperature")
    survey_id = state["survey_id"]
    persona_memory = state.get("persona_memory", True)
    round_number = state["round_number"]
    num_rounds = state["num_rounds"]
    prior_round_summary = state.get("prior_round_summary", "")

    system_prompt = _build_system_prompt(respondent, survey_id, persona_memory)

    if round_number == 1 or not prior_round_summary:
        user_prompt = DEBATE_DISCUSS_USER.format(
            question=question,
            round_number=round_number,
            num_rounds=num_rounds,
        )
    else:
        user_prompt = DEBATE_DISCUSS_FOLLOWUP_USER.format(
            question=question,
            round_number=round_number,
            num_rounds=num_rounds,
            prior_round_summary=prior_round_summary,
        )

    llm = get_llm(model, api_key, temperature=temperature)
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ])

    token_usage = _extract_token_usage(response)

    return {
        "debate_messages": [{
            "respondent_id": respondent["id"],
            "agent_name": agent_name,
            "model": model,
            "round": round_number,
            "text": response.content.strip(),
            "token_usage": token_usage,
        }]
    }


def summarize_round(state: DebateState) -> dict:
    """After a discussion round, summarize the open-ended responses for the next round."""
    debate_messages = state.get("debate_messages", [])
    question = state["question"]
    current_round = state["current_round"]

    round_messages = [m for m in debate_messages if m.get("round") == current_round]

    response_lines = []
    for msg in round_messages:
        response_lines.append(f"**{msg['agent_name']}**: {msg['text']}")
    responses_text = "\n\n".join(response_lines) if response_lines else "No responses received."

    llm = _get_summary_llm(state)
    if not llm:
        logger.error("No model with a valid API key available for summarization")
        return {
            "prior_round_summary": "Unable to generate summary — no API key available.",
            "current_round": current_round + 1,
        }

    response = llm.invoke([
        SystemMessage(content=DEBATE_SUMMARY_SYSTEM),
        HumanMessage(content=DEBATE_SUMMARY_USER.format(
            question=question,
            round_number=current_round,
            total_respondents=len(round_messages),
            responses_text=responses_text,
        )),
    ])

    return {
        "prior_round_summary": response.content.strip(),
        "current_round": current_round + 1,
    }


def analyze_debate(state: DebateState) -> dict:
    """After all discussion rounds, perform thematic analysis of the full debate."""
    debate_messages = state.get("debate_messages", [])
    question = state["question"]
    panel = state["panel"]
    num_rounds = state["num_rounds"]

    # Build panelist roster
    roster_lines = []
    for p in panel:
        role = p.get("role", "Unknown")
        industry = p.get("industry", "Unknown")
        region = p.get("region", "Unknown")
        roster_lines.append(f"- ID {p['id']}: {role} in {industry} ({region})")
    panelist_roster = "\n".join(roster_lines)

    # Build full transcript organized by round
    transcript_parts = []
    for round_num in range(1, num_rounds + 1):
        round_msgs = [m for m in debate_messages if m.get("round") == round_num]
        if not round_msgs:
            continue
        transcript_parts.append(f"### Round {round_num}")
        for msg in round_msgs:
            transcript_parts.append(
                f"**{msg['agent_name']}** (ID {msg['respondent_id']}): {msg['text']}"
            )
        transcript_parts.append("")
    full_transcript = "\n\n".join(transcript_parts)

    llm = _get_summary_llm(state)
    if not llm:
        logger.error("No model with a valid API key available for debate analysis")
        return {
            "analysis": {
                "themes": [],
                "consensus_points": [],
                "key_tensions": [],
                "synthesis": "Unable to generate analysis — no API key available.",
            }
        }

    # Use structured output for reliable thematic extraction
    structured_llm = llm.with_structured_output(DebateAnalysis)

    analysis_prompt = DEBATE_ANALYSIS_USER.format(
        question=question,
        num_rounds=num_rounds,
        num_panelists=len(panel),
        panelist_roster=panelist_roster,
        full_transcript=full_transcript,
    )

    try:
        result: DebateAnalysis = structured_llm.invoke([
            SystemMessage(content=DEBATE_ANALYSIS_SYSTEM),
            HumanMessage(content=analysis_prompt),
        ])
        token_usage = None  # structured output doesn't always expose usage
        analysis_dict = result.model_dump()
        analysis_dict["token_usage"] = token_usage
    except Exception:
        logger.exception("Structured analysis failed, falling back to unstructured")
        # Fallback: get raw text and return a minimal analysis
        raw_response = llm.invoke([
            SystemMessage(content=DEBATE_ANALYSIS_SYSTEM),
            HumanMessage(content=analysis_prompt),
        ])
        analysis_dict = {
            "themes": [],
            "consensus_points": [],
            "key_tensions": [],
            "synthesis": raw_response.content.strip(),
            "token_usage": _extract_token_usage(raw_response),
        }

    return {"analysis": analysis_dict}
