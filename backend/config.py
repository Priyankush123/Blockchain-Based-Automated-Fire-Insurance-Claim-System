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
    fi_contract_address: str = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    fi_private_key: str = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()

