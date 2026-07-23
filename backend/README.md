# AI Customer Support Assistant — Backend

## Overview
FastAPI backend for the AI Customer Support Assistant. Implements the full
pipeline from the project architecture: **Customer → Chat UI → API →
Retrieval Layer → LLM → Validator → Response → Ticket Database.**

## Architecture

```
Customer → Chat UI (frontend/) → API (main.py)
              → Retrieval Layer (retrieval/)   — knowledge base search
              → LLM (chatbot/gemini_client.py) — Gemini, with offline fallback
              → Validator (validators/)        — input + output sanitization
              → Response                        — returned to chat UI
              → Ticket Database (tickets/)      — auto-created on escalation
```

`chatbot/engine.py` orchestrates all of the above for every `/chat` request.
`chatbot/classifier.py` runs intent/sentiment/urgency detection independently
of the LLM (fast, deterministic, free) — it powers `/classify` too.

## Folder structure

```
backend/
├── main.py                  # FastAPI app — routes only, no business logic
├── database.py              # SQLAlchemy models + session (SQLite)
├── chatbot/
│   ├── engine.py            # Orchestrates retrieval -> LLM -> validator
│   ├── classifier.py        # Intent / sentiment / urgency detection
│   └── gemini_client.py     # LLM wrapper (Gemini + offline fallback)
├── retrieval/
│   ├── retriever.py         # Knowledge base search
│   └── knowledge_base.json  # FAQ data
├── prompts/
│   └── system_prompts.py    # LLM prompt templates
├── validators/
│   └── input_validator.py   # Input validation + output sanitization
├── tickets/
│   └── ticket_service.py    # Ticket CRUD logic
├── analytics/
│   └── analytics_service.py # Dashboard aggregation logic
├── tests/
│   └── test_backend.py      # pytest suite (8 tests)
├── requirements.txt
└── .env.example
```

## Installation

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
copy .env.example .env       # Windows
# cp .env.example .env       # Mac/Linux
```

Add your `GEMINI_API_KEY` to `.env` (get one at
https://aistudio.google.com/apikey). **Optional** — with no key, the app
automatically falls back to the keyword classifier + knowledge base, so the
chatbot still replies sensibly.

## Usage

```bash
uvicorn main:app --reload --port 8000
```

Visit `https://ai-customer-support-backend-pard.onrender.com` for interactive API docs.

Point your frontend's `API_BASE_URL` at this address — it already is, in
`chat.js`, `ticket.js`, `intent.js`, `sentiment.js`, `knowledge-retrieval.js`,
and `analytics.js`.

## API Documentation

| Endpoint | Method | Purpose |
|---|---|---|
| `/chat` | POST | Full pipeline: validate → retrieve → LLM reply → classify → save → auto-ticket |
| `/classify` | POST | Standalone intent/sentiment/urgency classification (Intent Detection, Sentiment Analysis pages) |
| `/knowledge/search` | POST | Standalone knowledge base search (Knowledge Retrieval page) |
| `/tickets` | GET | List all tickets |
| `/tickets/{id}` | GET | Ticket detail + full conversation transcript |
| `/tickets/{id}/status` | PATCH | Update ticket status (`open`/`pending`/`resolved`/`escalated`) |
| `/analytics/summary` | GET | Conversation/ticket counts, category + sentiment distribution |

## Testing

```bash
pytest tests/ -v
```

Covers the checklist: FAQ queries, invalid inputs, escalation detection,
intent detection.

## Future Improvements
- Swap SQLite for Postgres for production/multi-user use
- Add authentication (JWT) for the dashboard
- Historical time-series data for the ticket-trend chart (currently
  illustrative — no monthly aggregation stored yet)
- Real PDF/CSV export for the Reports page (currently a UI stub)
