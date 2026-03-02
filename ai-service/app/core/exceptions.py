class DocumentProcessingError(Exception):
    """Raised when document processing fails"""
    pass

class VectorStoreError(Exception):
    """Raised when vector store operations fail"""
    pass

class EmbeddingGenerationError(Exception):
    """Raised when embedding generation fails"""
    pass