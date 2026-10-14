# CyberAI — local development

CyberAI is a React/Vite frontend and FastAPI backend powered by the Gemini API.

## Requirements

- Python 3.11+ (Python 3.12 or 3.13 is a good choice for compatibility)
- Node.js 20.19+ or 22.12+
- A Gemini API key from Google AI Studio

## 1. Configure the backend

Open `backend/.env` and set `GEMINI_API_KEY` to your own key. Keep the key private and never commit or share the `.env` file.

Open a terminal in `backend` and run on Windows PowerShell:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m py_compile main.py document_store.py
python -m uvicorn main:app --reload
```

If PowerShell blocks activation, use Command Prompt instead or run `.venv\Scripts\python.exe -m pip install -r requirements.txt` and `.venv\Scripts\python.exe -m uvicorn main:app --reload` without activating.

Check `http://127.0.0.1:8000/api/health` for a JSON health response.

## 2. Start the frontend

Open a second terminal in `frontend` and run:

```bash
npm install
npm run build
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

## Chat and performance notes

- Suggested cards submit their text to the same `/chat` endpoint as the message composer. The “Document analysis” card opens the document-upload dialog by design.
- The backend streams plain-text chunks from Gemini. It uses low thinking effort for conversational responses and tries each configured fallback model at most once, avoiding repeated multi-second retry delays.
- First-token latency still depends on Google's API, model load, account quotas, network connection, and the selected model. No local code can guarantee ChatGPT-equivalent latency or uptime.
- Chat history is saved locally in this browser. Uploaded document text/embeddings are held in backend process memory and will be lost if the backend restarts.
- PDF files that are scans without an embedded text layer may not yield extractable text; OCR is not included.

## Troubleshooting

- If the backend reports a model error, verify the model ID is available to your API key and update `GEMINI_MODEL` in `backend/.env`.
- If a request fails, check the backend terminal for the detailed server-side error; user-facing errors avoid exposing SDK internals.
- Do not include `.env`, `.venv`, `node_modules`, or API keys in project archives or Git commits.
