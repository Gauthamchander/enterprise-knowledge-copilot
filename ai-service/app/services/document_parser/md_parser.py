from typing import Dict, Any
import logging
from app.services.document_parser.base import BaseParser
from app.core.exceptions import DocumentProcessingError

logger = logging.getLogger(__name__)

class MDParser(BaseParser):
    """Parser for Markdown (.md) files"""

    def extract_text(self, file_path: str) -> str:
        try:
            logger.info(f"Extracting text from Markdown: {file_path}")
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            return content
        except Exception as e:
            logger.error(f"Error extracting text from Markdown: {str(e)}")
            raise DocumentProcessingError(f"Failed to extract text from Markdown: {str(e)}")

    def parse(self, file_path: str) -> Dict[str, Any]:
        try:
            text = self.extract_text(file_path)
            # Minimal metadata for markdown files
            metadata = {"title": "", "author": ""}
            return {
                "text": text,
                "metadata": metadata,
                "file_path": file_path,
                "file_type": "md"
            }
        except Exception as e:
            logger.error(f"Error parsing Markdown: {str(e)}")
            raise DocumentProcessingError(f"Failed to parse Markdown: {str(e)}")

