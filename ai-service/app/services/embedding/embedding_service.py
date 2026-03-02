from sentence_transformers import SentenceTransformer
from typing import List
import logging
from app.config.settings import settings

# Set up logging for this module
logger = logging.getLogger(__name__)

class EmbeddingService:
    """Service for generating text embeddings using sentence-transformers"""
    
    def __init__(self):
        """Initialize the embedding model"""
        logger.info(f"Loading embedding model: {settings.embedding_model_name}")
        self.model = SentenceTransformer(settings.embedding_model_name)
        logger.info("Embedding model loaded successfully")
    
    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text
        
        Args:
            text: The text to embed
            
        Returns:
            List of floats representing the embedding vector
        """
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()
    
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts (faster than individual calls)
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()
    
    def get_embedding_dimension(self) -> int:
        """
        Get the dimension of embeddings produced by this model
        
        Returns:
            Dimension size (e.g., 768 for all-mpnet-base-v2)
        """
        # Get dimension by encoding a dummy text
        dummy_embedding = self.model.encode("test")
        return len(dummy_embedding)