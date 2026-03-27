from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import logging
import json
from app.models.schemas import QueryRequest, QueryResponse
from app.services.embedding.embedding_service import EmbeddingService
from app.services.vector_store.vector_store_service import VectorStoreService
from app.services.llm.llm_service import LLMService
from app.services.rag.rag_service import RAGService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/query", tags=["query"])

# Initialize services
_embedding_service = None
_vector_store_service = None
_llm_service = None
_rag_service = None

def get_rag_service() -> RAGService:
    """Get or create RAG service instance"""
    global _rag_service
    if _rag_service is None:
        global _embedding_service, _vector_store_service, _llm_service
        if _embedding_service is None:
            from app.services.embedding.embedding_service import EmbeddingService
            _embedding_service = EmbeddingService()
        if _vector_store_service is None:
            from app.services.vector_store.vector_store_service import VectorStoreService
            _vector_store_service = VectorStoreService(_embedding_service)
        if _llm_service is None:
            _llm_service = LLMService()
            logger.info(f"LLM Service initialized - Client available: {_llm_service.client is not None}")
        from app.services.rag.rag_service import RAGService
        _rag_service = RAGService(_vector_store_service, _llm_service)
        logger.info("RAG Service initialized successfully")
    return _rag_service

@router.post("/", response_model=QueryResponse)
async def query_knowledge_base(request: QueryRequest):
    """
    Query the knowledge base using RAG (Retrieval-Augmented Generation)
    
    - **query**: The search query
    - **max_results**: Maximum number of results (default: 5)
    - **score_threshold**: Minimum similarity score (default: 0.5)
    """
    try:
        logger.info(f"Query received: {request.query}")
        
        rag_service = get_rag_service()
        
        # Use RAG pipeline
        result = rag_service.query(
            query_text=request.query,
            max_results=request.max_results,
            score_threshold=request.score_threshold
        )
        
        return QueryResponse(
            answer=result["answer"],
            sources=result["sources"],
            query=result["query"]
        )
        
    except Exception as e:
        logger.error(f"Error querying knowledge base: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process query: {str(e)}")

@router.post("/stream")
async def query_knowledge_base_stream(request: QueryRequest):
    """
    Stream query response as Server-Sent Events (SSE).
    Events:
      - token: incremental answer token
      - sources: retrieved sources payload (once near the end)
      - done: final marker with assembled answer/query
      - error: error payload
    """
    try:
        logger.info(f"Streaming query received: {request.query}")
        rag_service = get_rag_service()

        # Retrieve chunks first so we can send both tokens and sources.
        retrieved_chunks = rag_service.vector_store_service.search(
            query_text=request.query,
            limit=request.max_results,
            score_threshold=request.score_threshold
        )

        sources = []
        for chunk in retrieved_chunks:
            sources.append({
                "text": chunk.get("text", ""),
                "score": chunk.get("score", 0),
                "metadata": chunk.get("metadata", {})
            })

        def event_stream():
            full_answer_parts = []
            try:
                for token in rag_service.llm_service.generate_answer_stream(
                    query=request.query,
                    context=retrieved_chunks
                ):
                    full_answer_parts.append(token)
                    yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"

                yield f"event: sources\ndata: {json.dumps({'sources': sources})}\n\n"
                yield f"event: done\ndata: {json.dumps({'answer': ''.join(full_answer_parts), 'query': request.query})}\n\n"
            except Exception as e:
                logger.error(f"Error in stream generator: {str(e)}", exc_info=True)
                yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    except Exception as e:
        logger.error(f"Error preparing streaming query: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process streaming query: {str(e)}")