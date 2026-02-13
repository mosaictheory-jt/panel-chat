from langchain_core.language_models.chat_models import BaseChatModel
from backend.config import settings


def get_llm(provider: str | None = None) -> BaseChatModel:
    provider = provider or settings.llm_provider

    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=settings.anthropic_model,
            api_key=settings.anthropic_api_key,
            max_tokens=1024,
        )
    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            max_tokens=1024,
        )
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")
