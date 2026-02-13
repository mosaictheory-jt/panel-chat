import logging

from langchain_core.messages import SystemMessage, HumanMessage

from backend.models.survey import QuestionBreakdown
from backend.services.llm import get_llm

logger = logging.getLogger(__name__)

ANALYZER_SYSTEM = """You are a survey design expert. Your job is to take the user's input and turn each distinct question into a structured sub-question with categorical answer options.

Critical rules:
- If the user asks ONE question, produce exactly ONE sub-question. Do NOT invent additional questions.
- If the user asks multiple distinct questions, produce one sub-question per question (up to 6).
- Do NOT expand, elaborate, or add follow-up questions beyond what the user actually asked.
- Each sub-question should have 3-6 answer options that are mutually exclusive and collectively exhaustive.
- Use "bar" chart_type for ordinal/ranked data (e.g., frequency, importance scales).
- Use "pie" chart_type for nominal/categorical data (e.g., tool choices, yes/no).
- Generate short IDs like "sq_1", "sq_2", etc.
- The sub-question text should closely match the user's original wording.
- The original_question field must contain the user's original input verbatim."""

ANALYZER_USER = """Convert the following into structured sub-questions with categorical answer options. Only create as many sub-questions as the user actually asked — do not add extra questions:

{question}"""


async def analyze_question(
    question: str,
    model: str,
    api_key: str,
) -> QuestionBreakdown:
    """Use an LLM with structured output to break down a question into sub-questions."""
    llm = get_llm(model, api_key)
    structured_llm = llm.with_structured_output(QuestionBreakdown)

    logger.info("Analyzing question with model=%s", model)

    result = structured_llm.invoke([
        SystemMessage(content=ANALYZER_SYSTEM),
        HumanMessage(content=ANALYZER_USER.format(question=question)),
    ])

    assert isinstance(result, QuestionBreakdown), "Structured output did not return QuestionBreakdown"
    assert len(result.sub_questions) > 0, "No sub-questions generated"
    logger.info("Breakdown generated: %d sub-questions", len(result.sub_questions))
    return result
