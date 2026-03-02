from fastapi import FastAPI
from app.config.settings import settings
from app.config.logging_config import setup_logging
from app.api.routes import health, ingestion, query

# Setup logging
setup_logging()

# Log startup information
import logging
logger = logging.getLogger(__name__)
logger.info("=" * 50)
logger.info("Starting AI Service...")
logger.info(f"Environment: {settings.environment}")
logger.info(f"Groq API Key loaded: {settings.groq_api_key is not None}")
logger.info(f"Groq API Key length: {len(settings.groq_api_key) if settings.groq_api_key else 0}")
logger.info(f"Groq Model: {settings.groq_model}")
logger.info("=" * 50)

# Create FastAPI app
app = FastAPI(
    title=settings.api_title,
    description="Advanced RAG system for enterprise knowledge base",
    version=settings.api_version
)

# Include routers
app.include_router(health.router)
app.include_router(ingestion.router)
app.include_router(query.router)

@app.get("/")
async def root():
    return {
        "message": "AI Service is running",
        "version": settings.api_version,
        "docs": "/docs"
    }