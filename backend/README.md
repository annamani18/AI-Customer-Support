# Backend — quick start

## 1. Setup (one time)
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
copy .env.example .env       # Windows
# cp .env.example .env       # Mac/Linux
```

Edit `.env` and add your `GEMINI_API_KEY` if you have one. **Not required** —
with no key, the app automatically uses the built-in keyword classifier and
knowledge base instead of calling Gemini, so the chatbot still replies.

## 2. Run
```bash
uvicorn main:app --reload --port 8000
```

Visit `http://127.0.0.1:8000/docs` to see/test all endpoints interactively.

## 3. Point your frontend at it
Your `chat.js` and `ticket.js` already have:
```js
const API_BASE_URL = "http://127.0.0.1:8000";
```
No changes needed there — just make sure this backend is running on port 8000
before you open the frontend pages.

## Endpoints (matched exactly to your existing JS)

- `POST /chat` — body `{ message, conversation_id }` → returns `{ conversation_id, reply, sources, intent, category, urgency, sentiment, sentiment_score, emotion, escalate, escalation_reason, ticket_id }`
- `GET /tickets` — list of tickets (auto-created whenever a chat gets classified as needing escalation)
- `GET /tickets/{id}` — ticket detail + full message transcript
- `PATCH /tickets/{id}/status` — body `{ status }`, one of `open|pending|resolved|escalated`

## Notes
- Database is SQLite (`support.db`), created automatically on first run — no setup needed.
- Ticket/conversation IDs are UUID strings (matches `ticket.js`'s `t.id.slice(0, 8)` usage).
- `dashboard.html`/`intent.html`/`sentiment.html`/`analytics.html`/`reports.html`/`knowledge-retrieval.html`/`settings.html` use only hardcoded demo data client-side — no backend calls, nothing to wire up there.
