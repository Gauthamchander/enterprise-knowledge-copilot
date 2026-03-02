from typing import List
import logging

logger = logging.getLogger(__name__)

def chunk_text(text: str,chunk_size: int = 500,chunk_overlap: int = 50) -> List[str]:
    """
    Split text into smaller chunks for embedding
    
    Args:
        text: The text to chunk
        chunk_size: Maximum number of characters per chunk
        chunk_overlap: Number of characters to overlap between chunks
        
    Returns:
        List of text chunks
    """
    if not text or len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        # Calculate end position
        end = start + chunk_size
        
        # If we're at the end, take remaining text
        if end >= len(text):
            chunks.append(text[start:])
            break
        
        # Try to break at a sentence or word boundary
        # Look for sentence endings first
        chunk = text[start:end]
        
        # Find last sentence ending (., !, ?)
        last_period = chunk.rfind('.')
        last_exclamation = chunk.rfind('!')
        last_question = chunk.rfind('?')
        last_newline = chunk.rfind('\n')
        
        # Find the best break point
        break_point = max(last_period, last_exclamation, last_question, last_newline)
        
        # If no good break point, try word boundary
        if break_point < chunk_size * 0.5:  # If break is too early
            last_space = chunk.rfind(' ')
            if last_space > 0:
                break_point = last_space
        
        # If still no good break, use the end
        if break_point <= 0:
            break_point = chunk_size
        
        # Extract chunk
        actual_end = start + break_point + 1
        chunk_text = text[start:actual_end].strip()
        
        if chunk_text:  # Only add non-empty chunks
            chunks.append(chunk_text)
        
        # Move start position with overlap
        start = actual_end - chunk_overlap
        if start < 0:
            start = 0
    
    logger.info(f"Split text into {len(chunks)} chunks")
    return chunks


def chunk_text_by_sentences(
    text: str,
    sentences_per_chunk: int = 5
) -> List[str]:
    """
    Split text into chunks by sentences (alternative method)
    
    Args:
        text: The text to chunk
        sentences_per_chunk: Number of sentences per chunk
        
    Returns:
        List of text chunks
    """
    # Simple sentence splitting (split on . ! ?)
    sentences = []
    current_sentence = ""
    
    for char in text:
        current_sentence += char
        if char in '.!?':
            sentences.append(current_sentence.strip())
            current_sentence = ""
    
    # Add remaining text if any
    if current_sentence.strip():
        sentences.append(current_sentence.strip())
    
    # Group sentences into chunks
    chunks = []
    for i in range(0, len(sentences), sentences_per_chunk):
        chunk = ' '.join(sentences[i:i + sentences_per_chunk])
        if chunk.strip():
            chunks.append(chunk)
    
    logger.info(f"Split text into {len(chunks)} chunks by sentences")
    return chunks