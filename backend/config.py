from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    temperature_threshold: float = 60.0
    smoke_threshold: int = 400
    required_duration_seconds: int = 5
    model_path: str = "ai/model/best_model.pkl"
    preprocessor_path: str = "ai/model/preprocessing_pipeline.pkl"
    metadata_path: str = "ai/model/model_metadata.json"
    
    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
