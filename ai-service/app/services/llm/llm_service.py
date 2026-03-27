from groq import Groq
from typing import List, Dict, Any
import logging
from app.config.settings import settings
from app.core.exceptions import EmbeddingGenerationError

logger = logging.getLogger(__name__)

class LLMService:
    """Service for LLM interactions using Groq"""
    
    def __init__(self):
        """Initialize LLM service"""
        logger.info("Initializing LLM Service...")
        logger.info(f"Groq API Key exists: {settings.groq_api_key is not None}")
        logger.info(f"Groq API Key length: {len(settings.groq_api_key) if settings.groq_api_key else 0}")
        
        if not settings.groq_api_key:
            logger.warning("Groq API key not set. LLM features will be disabled.")
            self.client = None
        else:
            try:
                self.client = Groq(api_key=settings.groq_api_key)
                logger.info("Groq client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {str(e)}")
                self.client = None
        self.model = settings.groq_model
        logger.info(f"Using model: {self.model}")
    
    def generate_answer(
        self,
        query: str,
        context: List[Dict[str, Any]]
    ) -> str:
        """
        Generate answer from query and context using LLM
        
        Args:
            query: User's question
            context: List of retrieved document chunks with metadata
            
        Returns:
            Generated answer
        """
        logger.info(f"generate_answer called - Client exists: {self.client is not None}")
        logger.info(f"Query: {query}")
        logger.info(f"Context chunks: {len(context)}")
        
        if not self.client:
            logger.warning("LLM client not available, using fallback")
            # Fallback: return first chunk if LLM not configured
            if context:
                return context[0].get("text", "No answer available.")
            return "LLM not configured. Please set GROQ_API_KEY in .env file."
        
        try:
            logger.info("Formatting context for LLM...")
            # Format context for prompt
            context_text = self._format_context(context)
            logger.info(f"Context formatted, length: {len(context_text)} characters")
            prompt = self._build_prompt(query=query, context_text=context_text)
            
            logger.info(f"Calling Groq API with model: {self.model}")
            # Generate response
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that answers questions based on provided context from company documents."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                # Keep generation shorter to reduce latency/timeouts.
                max_tokens=300
            )
            
            answer = response.choices[0].message.content
            logger.info(f"Generated answer using LLM, length: {len(answer)} characters")
            return answer
            
        except Exception as e:
            logger.error(f"Error generating answer: {str(e)}", exc_info=True)
            # Fallback to first chunk
            if context:
                logger.warning("Falling back to first chunk due to error")
                return context[0].get("text", "Error generating answer.")
            raise EmbeddingGenerationError(f"Failed to generate answer: {str(e)}")

    def generate_answer_stream(
        self,
        query: str,
        context: List[Dict[str, Any]]
    ):
        """
        Stream answer tokens from query/context.
        Yields incremental text chunks.
        """
        logger.info(f"generate_answer_stream called - Client exists: {self.client is not None}")
        logger.info(f"Query: {query}")
        logger.info(f"Context chunks: {len(context)}")

        if not self.client:
            logger.warning("LLM client not available for streaming")
            yield "LLM not configured. Please set GROQ_API_KEY in .env file."
            return

        try:
            context_text = self._format_context(context)
            prompt = self._build_prompt(query=query, context_text=context_text)

            stream = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that answers questions based on provided context from company documents."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=300,
                stream=True
            )

            for chunk in stream:
                try:
                    delta = chunk.choices[0].delta.content
                    if delta:
                        yield delta
                except Exception:
                    continue
        except Exception as e:
            logger.error(f"Error streaming answer: {str(e)}", exc_info=True)
            if context:
                yield context[0].get("text", "Error generating answer.")
                return
            raise EmbeddingGenerationError(f"Failed to stream answer: {str(e)}")

    def _build_prompt(self, query: str, context_text: str) -> str:
        """Build one shared prompt used by both normal and streaming calls."""
        return f"""Based on the following context from company documents, answer the question accurately and concisely.

If the answer is not in the provided context, you may still use information that is explicitly included in the question text (for example, values that are present in conversation history).

If the answer is neither in the provided context nor explicitly included in the question, say "I don't have enough information to answer this question based on the available documents."

If the user's question asks for the previous question (for example "What was my previous question?"), you MUST use the value of `Most recent user question:` from the question text and quote it exactly.

Context:
{context_text}

Question: {query}

Answer:"""
    
    def _format_context(self, context: List[Dict[str, Any]]) -> str:
        """Format context chunks for prompt"""
        formatted = []
        for i, chunk in enumerate(context, 1):
            text = chunk.get("text", "")
            metadata = chunk.get("metadata", {})
            source = metadata.get("source", "Unknown")
            formatted.append(f"[Document {i}] Source: {source}\n{text}\n")
        return "\n".join(formatted)