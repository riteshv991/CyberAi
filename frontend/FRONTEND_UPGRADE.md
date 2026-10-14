# CyberAI Frontend Upgrade

The frontend has been redesigned around the existing FastAPI endpoints. No backend API contract changes are required.

## Features
- Persistent local conversation history via localStorage
- Working New Chat, chat switching, rename, delete, clear history
- Search conversations
- Today / Yesterday / Previous 7 days / Older grouping
- Auto-generated chat titles from first prompt
- Advanced cybersecurity welcome dashboard and prompt cards
- Responsive mobile sidebar
- Document upload modal for PDF, DOCX and TXT
- Document-context state per conversation
- Markdown, GFM tables/lists and syntax-highlighted code responses
- Copy AI responses
- Loading/thinking state and backend connection error state
- Configurable API URL via `VITE_API_URL`

## Run

```powershell
npm install
npm run dev
```

The default API URL is `http://localhost:8000`, matching the current FastAPI CORS configuration.
