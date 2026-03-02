import logging
from app.config.settings import settings

def setup_logging():
    """Configure application logging"""
    log_level = logging.DEBUG if settings.environment == "development" else logging.INFO
    
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )