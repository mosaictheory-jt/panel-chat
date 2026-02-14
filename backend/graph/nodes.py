import json
import logging

from langchain_core.messages import SystemMessage, HumanMessage
from backend.graph.state import SurveyAgentState
from backend.graph.prompts import PERSONA_SYSTEM, SURVEY_USER
from backend.services.llm import get_llm

logger = logging.getLogger(__name__)


def _format_sub_questions(sub_questions: list[dict]) -> str:
    """Format sub-questions into a readable text block for the LLM prompt."""
    lines = []
    for sq in sub_questions:
        options_str = ", ".join(f'"{opt}"' for opt in sq["answer_options"])
        lines.append(f'- {sq["id"]}: {sq["text"]}\n  Options: [{options_str}]')
    return "\n".join(lines)


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
                # Fallback: return first option for each sub-question
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


def survey_respond(state: SurveyAgentState) -> dict:
    """Each persona answers the structured sub-questions."""
    respondent = state["respondent"]
    agent_name = state["agent_name"]
    sub_questions = state["sub_questions"]
    question = state["question"]
    model = state["model"]
    api_key = state["api_key"]
    temperature = state.get("temperature")

    system_prompt = PERSONA_SYSTEM.format(
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
    )

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

    # Extract token usage from response metadata (UsageMetadata is dict-like)
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

    return {
        "responses": [{
            "respondent_id": respondent["id"],
            "agent_name": agent_name,
            "model": model,
            "answers": answers,
            "token_usage": token_usage,
        }]
    }
