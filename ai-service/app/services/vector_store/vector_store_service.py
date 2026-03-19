from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from typing import List, Dict, Any, Optional
import logging
from app.config.settings import settings
from app.services.embedding.embedding_service import EmbeddingService
from app.core.exceptions import VectorStoreError

logger = logging.getLogger(__name__)

class VectorStoreService:
    """Service for managing vector store operations"""
    
    def __init__(self, embedding_service: EmbeddingService):
        """
        Initialize vector store service
        
        Args:
            embedding_service: Service for generating embeddings
        """
        self.embedding_service = embedding_service
        self.client = QdrantClient(url=settings.vector_store_url)
        self.collection_name = settings.vector_store_collection_name
        
        # Create collection if it doesn't exist
        self._ensure_collection_exists()
    
    def _ensure_collection_exists(self):
        """Create collection if it doesn't exist"""
        try:
            # Get embedding dimension
            embedding_dim = self.embedding_service.get_embedding_dimension()
            
            # Check if collection exists
            collections = self.client.get_collections()
            collection_names = [col.name for col in collections.collections]
            
            if self.collection_name not in collection_names:
                logger.info(f"Creating collection: {self.collection_name}")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=embedding_dim,
                        distance=Distance.COSINE
                    )
                )
                logger.info(f"Collection {self.collection_name} created successfully")
            else:
                logger.info(f"Collection {self.collection_name} already exists")
                
        except Exception as e:
            logger.error(f"Error ensuring collection exists: {str(e)}")
            raise VectorStoreError(f"Failed to create collection: {str(e)}")
    
    def add_documents(
        self,
        texts: List[str],
        metadata: List[Dict[str, Any]],
        ids: Optional[List[str]] = None
    ) -> List[str]:
        """
        Add documents to vector store
        
        Args:
            texts: List of text chunks to add
            metadata: List of metadata dictionaries (one per text)
            ids: Optional list of IDs (auto-generated if not provided)
            
        Returns:
            List of document IDs
        """
        try:
            logger.info(f"Adding {len(texts)} documents to vector store")
            
            # Generate embeddings for all texts
            embeddings = self.embedding_service.embed_batch(texts)
            
            # Generate IDs if not provided
            if ids is None:
                import uuid
                ids = [str(uuid.uuid4()) for _ in texts]
            
            # Prepare points for Qdrant
            points = []
            for i, (embedding, text, meta) in enumerate(zip(embeddings, texts, metadata)):
                # Add text to metadata
                full_metadata = {**meta, "text": text}
                
                point = PointStruct(
                    id=ids[i],
                    vector=embedding,
                    payload=full_metadata
                )
                points.append(point)
            
            # Upload points to Qdrant
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            
            logger.info(f"Successfully added {len(texts)} documents to vector store")
            return ids
            
        except Exception as e:
            logger.error(f"Error adding documents: {str(e)}")
            raise VectorStoreError(f"Failed to add documents: {str(e)}")
    
    def search(
        self,
        query_text: str,
        limit: int = 5,
        score_threshold: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents
        
        Args:
            query_text: The search query
            limit: Maximum number of results
            score_threshold: Minimum similarity score (0-1)
            
        Returns:
            List of similar documents with scores
        """
        try:
            logger.info(f"Searching for: {query_text}")
            
            # Generate embedding for query
            query_embedding = self.embedding_service.embed_text(query_text)
            
            # Search in Qdrant
            search_results = self.client.query_points(
                collection_name=self.collection_name,
                query=query_embedding,
                limit=limit,
                score_threshold=score_threshold
            ).points
            
            # Format results
            results = []
            for result in search_results:
                results.append({
                    "id": result.id,
                    "score": result.score,
                    "text": result.payload.get("text", ""),
                    "metadata": {k: v for k, v in result.payload.items() if k != "text"}
                })
            
            logger.info(f"Found {len(results)} results")
            return results
            
        except Exception as e:
            logger.error(f"Error searching: {str(e)}")
            raise VectorStoreError(f"Failed to search: {str(e)}")
    
    def delete_document(self, document_id: str) -> bool:
        """
        Delete a document from vector store
        
        Args:
            document_id: ID of document to delete
            
        Returns:
            True if successful
        """
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=[document_id]
            )
            logger.info(f"Deleted document: {document_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting document: {str(e)}")
            raise VectorStoreError(f"Failed to delete document: {str(e)}")
    
    def delete_by_document_id(self, document_id: str) -> int:
        """
        Delete all chunks belonging to a document by documentId
        
        Args:
            document_id: The collection ID (documentId) to delete
            
        Returns:
            Number of chunks deleted
        """
        try:
            logger.info(f"Deleting all chunks for documentId: {document_id}")
            
            # Delete all points where documentId matches in metadata
            result = self.client.delete(
                collection_name=self.collection_name,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="documentId",
                            match=MatchValue(value=document_id)
                        )
                    ]
                )
            )
            
            # Qdrant returns operation_id, but we can't easily get the count
            # The operation is async, so we'll return a success indicator
            if result.status == "completed" or hasattr(result, 'operation_id'):
                logger.info(f"Successfully deleted chunks for documentId: {document_id}")
                return 1  # Return 1 to indicate success
            else:
                logger.warning(f"Qdrant delete operation status: {result.status} for documentId: {document_id}")
                return 0
                
        except Exception as e:
            logger.error(f"Error deleting chunks by documentId: {str(e)}")
            raise VectorStoreError(f"Failed to delete chunks by documentId: {str(e)}")