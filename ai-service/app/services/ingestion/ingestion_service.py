from typing import Dict, Any, List, Optional
import logging
import os
from pathlib import Path
from app.services.document_parser.pdf_parser import PDFParser
from app.services.document_parser.docx_parser import DOCXParser
from app.services.document_parser.md_parser import MDParser
from app.services.embedding.embedding_service import EmbeddingService
from app.services.vector_store.vector_store_service import VectorStoreService
from app.utils.text_processing import chunk_text
from app.core.exceptions import DocumentProcessingError

logger = logging.getLogger(__name__)

class IngestionService:
    """Service for ingesting documents into the knowledge base"""
    
    def __init__(
        self,
        embedding_service: EmbeddingService,
        vector_store_service: VectorStoreService
    ):
        """
        Initialize ingestion service
        
        Args:
            embedding_service: Service for generating embeddings
            vector_store_service: Service for storing vectors
        """
        self.embedding_service = embedding_service
        self.vector_store_service = vector_store_service
        self.pdf_parser = PDFParser()
        self.docx_parser = DOCXParser()
        self.md_parser = MDParser()
    
    def ingest_document(
        self,
        file_path: str,
        file_type: str = "pdf",
        document_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Ingest a document into the knowledge base
        
        Complete flow:
        1. Parse document → Extract text
        2. Chunk text → Split into smaller pieces
        3. Generate embeddings → Convert chunks to vectors
        4. Store in vector database → Save for search
        
        Args:
            file_path: Path to the document file
            file_type: Type of file (pdf, docx, etc.)
            document_id: Optional collection ID for all chunks
            
        Returns:
            Dictionary with ingestion results
        """
        try:
            logger.info(f"Starting ingestion for file: {file_path}, document_id: {document_id}")
            
            # Step 1: Parse document and extract text
            logger.info("Step 1: Parsing document...")
            parsed_data = self._parse_document(file_path, file_type)
            text = parsed_data["text"]
            
            if not text or len(text.strip()) == 0:
                raise DocumentProcessingError("No text extracted from document")
            
            logger.info(f"Extracted {len(text)} characters from document")
            
            # Step 2: Chunk the text
            logger.info("Step 2: Chunking text...")
            chunks = chunk_text(text, chunk_size=500, chunk_overlap=50)
            logger.info(f"Created {len(chunks)} chunks")
            
            # Step 3 & 4: Generate embeddings and store
            logger.info("Step 3 & 4: Generating embeddings and storing...")
            document_ids = self._store_chunks(
                chunks=chunks,
                file_path=file_path,
                file_type=file_type,
                metadata=parsed_data.get("metadata", {}),
                document_id=document_id
            )
            
            # Prepare result
            result = {
                "file_path": file_path,
                "file_type": file_type,
                "num_chunks": len(chunks),
                "document_ids": document_ids,
                "metadata": parsed_data.get("metadata", {}),
                "status": "success"
            }
            
            logger.info(f"Successfully ingested document: {file_path}")
            return result
            
        except Exception as e:
            logger.error(f"Error ingesting document: {str(e)}")
            raise DocumentProcessingError(f"Failed to ingest document: {str(e)}")
    
    def _parse_document(self, file_path: str, file_type: str) -> Dict[str, Any]:
        """
        Parse document based on file type
        
        Args:
            file_path: Path to the file
            file_type: Type of file
            
        Returns:
            Parsed document data
        """
        if not os.path.exists(file_path):
            raise DocumentProcessingError(f"File not found: {file_path}")
        
        ft = file_type.lower()
        if ft == "pdf":
            return self.pdf_parser.parse(file_path)
        elif ft == "docx":
            return self.docx_parser.parse(file_path)
        elif ft in ("md", "markdown", "txt"):
            return self.md_parser.parse(file_path)
        else:
            raise DocumentProcessingError(f"Unsupported file type: {file_type}")
    
    def _store_chunks(
        self,
        chunks: List[str],
        file_path: str,
        file_type: str,
        metadata: Dict[str, Any],
        document_id: Optional[str] = None
    ) -> List[str]:
        """
        Store chunks in vector store with metadata
        
        Args:
            chunks: List of text chunks
            file_path: Original file path
            file_type: Type of file
            metadata: Document metadata
            document_id: Optional collection ID for all chunks
            
        Returns:
            List of document IDs
        """
        # Prepare metadata for each chunk
        file_name = Path(file_path).name
        chunks_metadata = []
        
        for i, chunk in enumerate(chunks):
            chunk_meta = {
                "source": file_name,
                "file_path": file_path,
                "file_type": file_type,
                "chunk_index": i,
                "total_chunks": len(chunks),
                **metadata  # Include original metadata
            }
            
            # Add documentId to metadata if provided
            if document_id:
                chunk_meta["documentId"] = document_id
            
            chunks_metadata.append(chunk_meta)
        
        # Store in vector database
        document_ids = self.vector_store_service.add_documents(
            texts=chunks,
            metadata=chunks_metadata
        )
        
        return document_ids