from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class QueryRequest(BaseModel):
    """Request model for querying the knowledge base"""
    query: str
    max_results: Optional[int] = 5
    score_threshold: Optional[float] = 0.5

class QueryResponse(BaseModel):
    """Response model for query results"""
    answer: str
    sources: List[Dict[str, Any]]
    query: str

class IngestionRequest(BaseModel):
    """Request model for document ingestion"""
    file_path: str
    file_type: Optional[str] = "pdf"

class IngestionResponse(BaseModel):
    """Response model for ingestion results"""
    status: str
    file_path: str
    num_chunks: int
    document_ids: List[str]
    message: str