from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    duckdb_path: str = "panel_chat.duckdb"
    csv_path: str = "survey_2026_data_engineering.csv"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
