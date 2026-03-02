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
            
            if not retrieved_chunks:
                return {
                    "answer": "I don't have enough information to answer this question based on the available documents.",
                    "sources": [],
                    "query": query_text
                }
            
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