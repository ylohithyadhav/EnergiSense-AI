from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "EnergiSense AI API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # CORS Origins
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://energisense-ai.web.app",
        "https://energisense-ai.firebaseapp.com"
    ]
    
    # File limits
    MAX_UPLOAD_SIZE_MB: int = 50
    
    # Firebase configuration
    FIREBASE_PROJECT_ID: str = Field(default="")
    FIREBASE_CREDENTIALS_PATH: str = Field(default="")
    
    # Environment
    ENVIRONMENT: str = Field(default="development")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
