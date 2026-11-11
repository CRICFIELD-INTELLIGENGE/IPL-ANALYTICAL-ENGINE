import re
import logging
from src.config import PIPELINE_LOG

def setup_logger():
    """Sets up a robust pipeline logger writing to both stdout and a file."""
    logger = logging.getLogger("ingestion_pipeline")
    logger.setLevel(logging.INFO)
    
    if not logger.handlers:
        formatter = logging.Formatter('[%(asctime)s] %(levelname)s - %(message)s', '%Y-%m-%d %H:%M:%S')
        
        # File handler
        fh = logging.FileHandler(PIPELINE_LOG, encoding="utf-8")
        fh.setFormatter(formatter)
        logger.addHandler(fh)
        
        # Console handler
        ch = logging.StreamHandler()
        ch.setFormatter(formatter)
        logger.addHandler(ch)
        
    return logger

logger = setup_logger()

def sanitize_name(name: str) -> str:
    """Converts a player name into a clean filesystem-friendly lower_snake_case format."""
    # Trim, lowercase, replace spaces/hyphens/dots with underscores
    s = name.strip().lower()
    s = re.sub(r'[\.\-\s]+', '_', s)
    # Remove any character that is not alphanumeric or underscore
    s = re.sub(r'[^\w_]', '', s)
    # Clean up multiple consecutive underscores
    s = re.sub(r'_+', '_', s)
    return s.strip('_')
