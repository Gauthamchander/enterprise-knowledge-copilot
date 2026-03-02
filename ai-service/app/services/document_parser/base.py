from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseParser(ABC):
    """Base class for all document parsers"""
    
    @abstractmethod
    def parse(self, file_path: str) -> Dict[str, Any]:
        """Parse document and return structured data"""
        pass
    
    @abstractmethod
    def extract_text(self, file_path: str) -> str:
        """Extract plain text from document"""
        pass