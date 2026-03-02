import fitz
from typing import Dict, Any
import logging
from app.services.document_parser.base import BaseParser
from app.core.exceptions import DocumentProcessingError

logger = logging.getLogger(__name__)

class PDFParser(BaseParser):
    """Parser for PDF documents using PyMuPDF"""
    
    def extract_text(self, file_path: str) -> str:
        """
        Extract plain text from PDF file using PyMuPDF
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Extracted text as a string
            
        Raises:
            DocumentProcessingError: If PDF cannot be processed
        """
        try:
            logger.info(f"Extracting text from PDF: {file_path}")
            
            # Open PDF
            doc = fitz.open(file_path)
            
            # Extract text from all pages
            text_parts = []
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text()
                if text.strip():  # Only add non-empty text
                    text_parts.append(text)
            
            # Close document
            doc.close()
            
            # Combine all pages
            full_text = "\n\n".join(text_parts)
            
            logger.info(f"Successfully extracted {len(full_text)} characters from PDF")
            return full_text
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            raise DocumentProcessingError(f"Failed to extract text from PDF: {str(e)}")
    
    def parse(self, file_path: str) -> Dict[str, Any]:
        """
        Parse PDF and return structured data
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Dictionary with parsed data
        """
        try:
            logger.info(f"Parsing PDF: {file_path}")
            
            # Open PDF
            doc = fitz.open(file_path)
            
            # Extract text
            text = self.extract_text(file_path)
            
            # Get metadata
            metadata = doc.metadata
            
            # Get number of pages
            num_pages = len(doc)
            
            # Close document
            doc.close()
            
            # Return structured data
            return {
                "text": text,
                "num_pages": num_pages,
                "metadata": {
                    "title": metadata.get("title", ""),
                    "author": metadata.get("author", ""),
                    "subject": metadata.get("subject", ""),
                    "creator": metadata.get("creator", ""),
                },
                "file_path": file_path,
                "file_type": "pdf"
            }
            
        except Exception as e:
            logger.error(f"Error parsing PDF: {str(e)}")
            raise DocumentProcessingError(f"Failed to parse PDF: {str(e)}")