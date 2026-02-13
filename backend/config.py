from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    llm_provider: str = "anthropic"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"
    openai_model: str = "gpt-4o"
    duckdb_path: str = "panel_chat.duckdb"
    csv_path: str = "survey_2026_data_engineering.csv"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
