from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API Configuration
    api_title: str = "Enterprise Knowledge Copilot AI Service"
    api_version: str = "1.0.0"
    
    # Environment
    environment: str = "development"
    
    # Embedding Model Configuration
    embedding_model_name: str = "all-mpnet-base-v2"
    
    # Vector Store Configuration
    vector_store_url: str = "http://localhost:6333"
    vector_store_collection_name: str = "knowledge_base"
    
    # LLM Configuration (Groq)
    groq_api_key: Optional[str] = None
    groq_model: str = "llama-3.1-8b-instant"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()