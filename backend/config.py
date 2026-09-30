from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Verification thresholds
    temperature_threshold: float = 60.0
    smoke_threshold: int = 400
    required_duration_seconds: int = 5

    # AI model paths
    model_path: str = "ai/model/best_model.pkl"
    preprocessor_path: str = "ai/model/preprocessing_pipeline.pkl"
    metadata_path: str = "ai/model/model_metadata.json"

    # Blockchain settings
    web3_rpc_url: str = "http://127.0.0.1:8545"
    fi_contract_address: str = ""
    fi_private_key: str = ""

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()

