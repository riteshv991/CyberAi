import os
from pathlib import Path
import numpy as np
from google import genai
from google.genai import types
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001").strip()
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1200"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "200"))
MIN_SIMILARITY = float(os.getenv("RAG_MIN_SIMILARITY", "0.45"))
DEFAULT_TOP_K = int(os.getenv("RAG_TOP_K", "5"))

client = genai.Client(api_key=API_KEY)
documents_by_chat: dict[str, list[dict]] = {}


def create_chunks(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP):
    text = text.strip()
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start = max(0, end - overlap)
    return chunks


def embed(text: str, task_type: str):
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(task_type=task_type),
    )
    embedding = result.embeddings[0].values
    return np.asarray(embedding, dtype=np.float32)


def cosine(a, b):
    denominator = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denominator) if denominator else 0.0


def add_document(chat_id: str, filename: str, content: str):
    chunks = []
    for chunk in create_chunks(content):
        try:
            vector = embed(chunk, "RETRIEVAL_DOCUMENT")
            chunks.append({"content": chunk, "embedding": vector})
        except Exception as exc:
            print(f"[RAG] embedding failed: {exc}")
    documents_by_chat.setdefault(chat_id, []).append({
        "filename": filename,
        "content": content,
        "chunks": chunks,
    })


def get_all_documents(chat_id: str):
    return documents_by_chat.get(chat_id, [])


def search_documents(chat_id: str, query: str, top_k: int = DEFAULT_TOP_K):
    docs = get_all_documents(chat_id)
    if not docs:
        return []
    try:
        query_vector = embed(query, "RETRIEVAL_QUERY")
    except Exception as exc:
        print(f"[RAG] query embedding failed: {exc}")
        return []

    matches = []
    for doc in docs:
        for chunk in doc["chunks"]:
            score = cosine(query_vector, chunk["embedding"])
            if score >= MIN_SIMILARITY:
                matches.append({
                    "filename": doc["filename"],
                    "content": chunk["content"],
                    "score": score,
                })
    matches.sort(key=lambda item: item["score"], reverse=True)
    return matches[:top_k]
