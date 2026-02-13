from langchain_core.messages import SystemMessage, HumanMessage
from backend.graph.state import AgentState, DebateState
from backend.graph.prompts import PERSONA_SYSTEM, ROUND_1_USER, ROUND_N_USER
from backend.services.llm import get_llm


def agent_respond(state: AgentState) -> dict:
    respondent = state["respondent"]
    agent_name = state["agent_name"]
    question = state["question"]
    round_num = state["round_num"]
    previous_responses = state.get("previous_responses", "")
    model = state["model"]
    api_key = state["api_key"]

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

    if round_num == 1 or not previous_responses:
        user_prompt = ROUND_1_USER.format(question=question)
    else:
        user_prompt = ROUND_N_USER.format(
            question=question,
            previous_responses=previous_responses,
        )

    llm = get_llm(model, api_key)
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ])

    return {
        "round_responses": [{
            "respondent_id": respondent["id"],
            "agent_name": agent_name,
            "round_num": round_num,
            "content": response.content,
        }]
    }


def collect_round(state: DebateState) -> dict:
    finished_round = state["current_round"] + 1
    current_responses = [r for r in state["round_responses"] if r["round_num"] == finished_round]
    all_rounds = list(state.get("all_rounds") or [])
    all_rounds.append(current_responses)

    return {
        "all_rounds": all_rounds,
        "current_round": finished_round,
    }
