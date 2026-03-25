from typing import List, Dict, Any
import logging
from app.services.vector_store.vector_store_service import VectorStoreService
from app.services.llm.llm_service import LLMService

logger = logging.getLogger(__name__)

class RAGService:
    """Service for RAG (Retrieval-Augmented Generation) pipeline"""
    
    def __init__(
        self,
        vector_store_service: VectorStoreService,
        llm_service: LLMService
    ):
        """
        Initialize RAG service
        
        Args:
            vector_store_service: Service for vector search
            llm_service: Service for LLM generation
        """
        self.vector_store_service = vector_store_service
        self.llm_service = llm_service
    
    def query(
        self,
        query_text: str,
        max_results: int = 5,
        score_threshold: float = 0.5
    ) -> Dict[str, Any]:
        """
        Complete RAG pipeline: Retrieve + Generate
        
        Args:
            query_text: User's question
            max_results: Maximum number of chunks to retrieve
            score_threshold: Minimum similarity score
            
        Returns:
            Dictionary with answer and sources
        """
        try:
            logger.info(f"Processing RAG query: {query_text}")
            
            # Step 1: Retrieve relevant chunks
            logger.info("Step 1: Retrieving relevant chunks...")
            retrieved_chunks = self.vector_store_service.search(
                query_text=query_text,
                limit=max_results,
                score_threshold=score_threshold
            )
            
            # Even if retrieval returns nothing, we can still answer questions that
            # are explicitly included in the query text (e.g., "What was my previous question?").
            # So we fall through to the LLM with an empty context instead of returning early.
            if not retrieved_chunks:
                logger.info("No relevant chunks found; calling LLM with empty context")
                retrieved_chunks = []
            
            logger.info(f"Retrieved {len(retrieved_chunks)} chunks")
            
            # Step 2: Generate answer using LLM
            logger.info("Step 2: Generating answer with LLM...")
            answer = self.llm_service.generate_answer(
                query=query_text,
                context=retrieved_chunks
            )
            
            # Format sources
            sources = []
            for chunk in retrieved_chunks:
                sources.append({
                    "text": chunk.get("text", ""),
                    "score": chunk.get("score", 0),
                    "metadata": chunk.get("metadata", {})
                })
            
            logger.info("RAG query completed successfully")
            return {
                "answer": answer,
                "sources": sources,
                "query": query_text
            }
            
        except Exception as e:
            logger.error(f"Error in RAG pipeline: {str(e)}")
            raise