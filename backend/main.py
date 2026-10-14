import io
import os
import logging
from pathlib import Path
from typing import Iterable

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from pypdf import PdfReader
from docx import Document
from google import genai
from google.genai import types

from document_store import add_document, search_documents

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cyberai")

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
PRIMARY_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()
FALLBACK_MODELS = [
    m.strip() for m in os.getenv(
        "GEMINI_FALLBACK_MODELS",
        "gemini-3.6-flash,gemini-3.5-flash-lite",
    ).split(",") if m.strip()
]
MAX_UPLOAD_MB = max(1, int(os.getenv("MAX_UPLOAD_MB", "25")))
MAX_DOCUMENT_CHARS = max(1000, int(os.getenv("MAX_DOCUMENT_CHARS", "60000")))
FRONTEND_ORIGINS = [
    x.strip() for x in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",") if x.strip()
]

if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY is missing. Put your Gemini API key in backend/.env")

client = genai.Client(api_key=API_KEY)

app = FastAPI(title="CyberAI", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


class ChatRequest(BaseModel):
    message: str = Field(..., max_length=20000)
    chat_id: str = Field(default="default", max_length=200)


SYSTEM_PROMPT = """
You are CyberAI, an expert cybersecurity assistant.

Focus on cybersecurity, information security, privacy, networking, cloud security,
SOC, SIEM, incident response, vulnerability management, secure coding, ethical
security testing, and security education.

Answer cybersecurity questions accurately and practically. Use Markdown, headings,
bullets, tables, and code blocks when useful. Explain technical terms clearly.
For security testing, assume authorized environments and distinguish defensive or
lab use from unauthorized access. Never claim that you ran a command, scanned a
host, accessed a website, or verified a vulnerability unless this application
actually performed that action.

For ordinary greetings, respond naturally. For unrelated topics, briefly explain
that CyberAI focuses on cybersecurity and offer to help with a related topic.
""".strip()

DOCUMENT_SYSTEM_PROMPT = """
You are CyberAI in document-grounded mode.
Answer using ONLY the supplied document excerpts. Do not use outside knowledge to
fill gaps. If the excerpts do not contain enough information, say exactly:
I couldn't find that information in the uploaded document.
""".strip()


def is_fallback_worthy(exc: Exception) -> bool:
    """Return True for errors where trying a different model may help."""
    text = str(exc).lower()
    markers = (
        "503", "unavailable", "high demand", "429", "resource exhausted",
        "rate limit", "temporarily", "overloaded", "404", "not found",
        "unsupported model", "invalid argument", "deadline", "timed out",
        "timeout",
    )
    return any(marker in text for marker in markers)


def model_candidates() -> list[str]:
    """Try the primary model first, then each configured fallback once."""
    result = []
    for model in [PRIMARY_MODEL, *FALLBACK_MODELS]:
        if model and model not in result:
            result.append(model)
    return result


def generation_config(system_instruction: str, max_output_tokens: int):
    """Use a low thinking budget for a more responsive conversational experience."""
    return types.GenerateContentConfig(
        system_instruction=system_instruction,
        max_output_tokens=max_output_tokens,
        temperature=0.3,
        thinking_config=types.ThinkingConfig(thinking_level="low"),
    )


def generate_stream(contents: str, system_instruction: str) -> Iterable[str]:
    """Stream the first available model response without long retry backoffs."""
    last_error: Exception | None = None

    for model_name in model_candidates():
        received_text = False
        try:
            logger.info("Starting Gemini stream with model %s", model_name)
            stream = client.models.generate_content_stream(
                model=model_name,
                contents=contents,
                config=generation_config(system_instruction, max_output_tokens=1536),
            )

            for chunk in stream:
                chunk_text = getattr(chunk, "text", None) or ""
                if chunk_text:
                    received_text = True
                    yield chunk_text

            if received_text:
                logger.info("Gemini stream completed with model %s", model_name)
                return

            last_error = RuntimeError(
                f"Gemini model '{model_name}' returned an empty response."
            )

        except Exception as exc:
            last_error = exc
            logger.warning("Gemini stream failed for model %s: %s", model_name, exc)

            # Once output is sent, never append another model's answer.
            if received_text:
                yield "\n\n**Connection interrupted:** Please send your message again."
                return

            # Do not retry the same model with multi-second sleeps. Move to the
            # next configured model only for a likely transient/model issue.
            if not is_fallback_worthy(exc):
                break

    yield friendly_gemini_error(last_error)


def generate_text(contents: str, system_instruction: str) -> str:
    """Generate a non-streaming response for uploaded-document analysis."""
    last_error: Exception | None = None

    for model_name in model_candidates():
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=generation_config(system_instruction, max_output_tokens=1024),
            )
            response_text = getattr(response, "text", None)
            if response_text:
                return response_text
            last_error = RuntimeError(
                f"Gemini model '{model_name}' returned an empty response."
            )
        except Exception as exc:
            last_error = exc
            logger.warning("Gemini text generation failed for model %s: %s", model_name, exc)
            if not is_fallback_worthy(exc):
                break

    return friendly_gemini_error(last_error)

def friendly_gemini_error(exc: Exception | None) -> str:
    if exc is None:
        return "**CyberAI error:** No response was returned by Gemini."
    text = str(exc)
    lower = text.lower()
    if "401" in lower or "unauthenticated" in lower or "api key" in lower:
        return "**CyberAI error:** Gemini authentication failed. Create a new Gemini API key in Google AI Studio and replace `GEMINI_API_KEY` in `backend/.env`."
    if "403" in lower or "permission" in lower:
        return "**CyberAI error:** Gemini rejected this API key or project permission. Check the key's project and API access in Google AI Studio."
    if "429" in lower or "resource exhausted" in lower or "rate limit" in lower:
        return "**CyberAI error:** Gemini rate limit reached. Please wait a moment and try again."
    if "503" in lower or "unavailable" in lower or "high demand" in lower:
        return "**CyberAI error:** Gemini is temporarily unavailable. CyberAI tried the configured fallback models. Please try again in a moment."
    if "404" in lower and "model" in lower:
        return "**CyberAI error:** The configured Gemini model is unavailable for this API project. Check `GEMINI_MODEL` in `backend/.env`."
    logger.exception("Gemini request failed: %s", exc)
    return "**CyberAI error:** The request to Gemini failed. Check the backend terminal for details."


@app.get("/")
def home():
    return {"message": "CyberAI Backend Running Successfully!", "model": PRIMARY_MODEL}


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "CyberAI", "model": PRIMARY_MODEL}


@app.post("/chat")
def chat(request: ChatRequest):
    message = request.message.strip()
    if not message:
        return StreamingResponse(iter(["Please enter a message."]), media_type="text/plain; charset=utf-8")

    prompt = f"User question:\n{message}\n\nRespond as CyberAI."
    return StreamingResponse(
        generate_stream(prompt, SYSTEM_PROMPT),
        media_type="text/plain; charset=utf-8",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def extract_document(file_bytes: bytes, filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        reader = PdfReader(io.BytesIO(file_bytes))
        pages = []
        total = 0
        for page in reader.pages:
            if total >= MAX_DOCUMENT_CHARS:
                break
            page_text = (page.extract_text() or "").strip()
            if page_text:
                page_text = page_text[:MAX_DOCUMENT_CHARS - total]
                pages.append(page_text)
                total += len(page_text)
        return "\n\n".join(pages)
    if suffix == ".docx":
        document = Document(io.BytesIO(file_bytes))
        paragraphs = []
        total = 0
        for paragraph in document.paragraphs:
            text = paragraph.text.strip()
            if not text:
                continue
            remaining = MAX_DOCUMENT_CHARS - total
            if remaining <= 0:
                break
            text = text[:remaining]
            paragraphs.append(text)
            total += len(text)
        return "\n".join(paragraphs)
    if suffix == ".txt":
        return file_bytes.decode("utf-8", errors="ignore")[:MAX_DOCUMENT_CHARS]
    raise ValueError("Unsupported file type. Please upload PDF, DOCX, or TXT.")


@app.post("/upload")
async def upload_file(file: UploadFile = File(...), chat_id: str = Form("default")):
    try:
        max_bytes = MAX_UPLOAD_MB * 1024 * 1024
        file_bytes = await file.read(max_bytes + 1)
        if len(file_bytes) > max_bytes:
            return {"response": f"File is too large. Maximum size is {MAX_UPLOAD_MB} MB."}

        filename = file.filename or "document"
        text = extract_document(file_bytes, filename).strip()
        if not text:
            return {"response": "No readable text found in the uploaded document."}

        text = text[:MAX_DOCUMENT_CHARS]
        add_document(chat_id, filename, text)

        prompt = f"""
Analyze this uploaded document for a cybersecurity learner.

DOCUMENT:
{text}

Return Markdown with these sections:
# 📄 Document Summary
# 📚 Main Topics
# 🎯 Difficulty Level
# 🔑 Important Concepts
# 💡 Recommendations
""".strip()
        analysis = generate_text(prompt, "You are CyberAI. Analyze the supplied document accurately.")
        return {"filename": filename, "chat_id": chat_id, "response": analysis}
    except ValueError as exc:
        return {"response": str(exc)}
    except Exception:
        logger.exception("Document upload failed")
        return {"response": "The document could not be processed. Check the backend terminal for details."}
    finally:
        await file.close()


@app.post("/document-chat")
def document_chat(request: ChatRequest):
    results = search_documents(request.chat_id, request.message, top_k=5)
    if not results:
        return StreamingResponse(
            iter(["I couldn't find that information in the uploaded document."]),
            media_type="text/plain; charset=utf-8",
        )

    context = "\n\n".join(
        f"--- Relevant Section {i} ---\nDocument: {item['filename']}\n{item['content']}"
        for i, item in enumerate(results, start=1)
    )
    prompt = f"DOCUMENT EXCERPTS:\n{context}\n\nUSER QUESTION:\n{request.message}\n\nAnswer only from the excerpts."
    return StreamingResponse(
        generate_stream(prompt, DOCUMENT_SYSTEM_PROMPT),
        media_type="text/plain; charset=utf-8",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
