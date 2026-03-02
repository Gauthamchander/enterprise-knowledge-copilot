from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
import os
import tempfile
import logging
from app.models.schemas import IngestionRequest, IngestionResponse
from app.services.embedding.embedding_service import EmbeddingService
from app.services.vector_store.vector_store_service import VectorStoreService
from app.services.ingestion.ingestion_service import IngestionService
from app.core.exceptions import DocumentProcessingError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ingestion", tags=["ingestion"])

# Initialize services (in production, use dependency injection)
_embedding_service = None
_vector_store_service = None
_ingestion_service = None

def get_ingestion_service() -> IngestionService:
    """Get or create ingestion service instance"""
    global _ingestion_service
    if _ingestion_service is None:
        global _embedding_service, _vector_store_service
        if _embedding_service is None:
            _embedding_service = EmbeddingService()
        if _vector_store_service is None:
            _vector_store_service = VectorStoreService(_embedding_service)
        _ingestion_service = IngestionService(_embedding_service, _vector_store_service)
    return _ingestion_service

@router.post("/upload", response_model=IngestionResponse)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and ingest a document
    
    - **file**: The document file to upload (PDF, DOCX, etc.)
    """
    try:
        logger.info(f"Received file upload: {file.filename}")
        
        # Determine file type from extension
        file_extension = os.path.splitext(file.filename)[1].lower()
        file_type_map = {
            ".pdf": "pdf",
            ".docx": "docx",
            ".doc": "docx",
            ".txt": "txt",
            ".md": "md",
            ".markdown": "md"
        }
        file_type = file_type_map.get(file_extension, "pdf")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Ingest the document
            ingestion_service = get_ingestion_service()
            result = ingestion_service.ingest_document(temp_file_path, file_type)
            
            # Return response
            return IngestionResponse(
                status="success",
                file_path=file.filename,
                num_chunks=result["num_chunks"],
                document_ids=result["document_ids"],
                message=f"Successfully ingested {result['num_chunks']} chunks from {file.filename}"
            )
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
                
    except DocumentProcessingError as e:
        logger.error(f"Document processing error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

@router.post("/ingest", response_model=IngestionResponse)
async def ingest_document(request: IngestionRequest):
    """
    Ingest a document from file path
    
    - **file_path**: Path to the document file
    - **file_type**: Type of file (pdf, docx, etc.)
    """
    try:
        logger.info(f"Ingesting document: {request.file_path}")
        
        ingestion_service = get_ingestion_service()
        result = ingestion_service.ingest_document(request.file_path, request.file_type)
        
        return IngestionResponse(
            status="success",
            file_path=result["file_path"],
            num_chunks=result["num_chunks"],
            document_ids=result["document_ids"],
            message=f"Successfully ingested {result['num_chunks']} chunks"
        )
        
    except DocumentProcessingError as e:
        logger.error(f"Document processing error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error ingesting document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to ingest document: {str(e)}")