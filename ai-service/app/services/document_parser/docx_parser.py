from docx import Document
from typing import Dict, Any
import logging
from app.services.document_parser.base import BaseParser
from app.core.exceptions import DocumentProcessingError

logger = logging.getLogger(__name__)

class DOCXParser(BaseParser):
    """Parser for DOCX files using python-docx"""

    def extract_text(self, file_path: str) -> str:
        try:
            logger.info(f"Extracting text from DOCX: {file_path}")
            doc = Document(file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
            full_text = "\n\n".join(paragraphs)
            logger.info(f"Extracted {len(full_text)} characters from DOCX")
            return full_text
        except Exception as e:
            logger.error(f"Error extracting text from DOCX: {str(e)}")
            raise DocumentProcessingError(f"Failed to extract text from DOCX: {str(e)}")

    def parse(self, file_path: str) -> Dict[str, Any]:
        try:
            text = self.extract_text(file_path)
            # python-docx doesn't provide rich metadata easily; return minimal metadata
            metadata = {"title": "", "author": ""}
            return {
                "text": text,
                "metadata": metadata,
                "file_path": file_path,
                "file_type": "docx"
            }
        except Exception as e:
            logger.error(f"Error parsing DOCX: {str(e)}")
            raise DocumentProcessingError(f"Failed to parse DOCX: {str(e)}")

