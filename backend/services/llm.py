from langchain_core.language_models.chat_models import BaseChatModel


def _detect_provider(model: str) -> str:
    if model.startswith("claude"):
        return "anthropic"
    if model.startswith(("gpt", "o1", "o3", "o4")):
        return "openai"
    if model.startswith("gemini"):
        return "google"
    raise ValueError(f"Cannot detect provider for model: {model}")


def get_llm(model: str, api_key: str) -> BaseChatModel:
    provider = _detect_provider(model)

    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=model,
            api_key=api_key,
            max_tokens=1024,
        )
    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            max_tokens=1024,
        )
    elif provider == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            max_output_tokens=1024,
        )
    else:
        raise ValueError(f"Unknown provider: {provider}")
