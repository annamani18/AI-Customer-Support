# What changed and why

## Backend

**`backend/main.py`**
- Added `GET /auth/me` — returns `{id, email, name, role, initials}`. Name/initials are derived from the email (e.g. `honey.m@x.com` → "Honey M" / "HM") since the `User` table has no name column and we agreed not to add one.
- Added `POST /tickets/escalate` — real backend call for the "Connect me to a human agent" button. Takes `{conversation_id, reason}`, reuses your existing `ticket_service.create_or_update_ticket`.

**`backend/chatbot/engine.py`**
- Reordered the reply pipeline to KB-first → Gemini fallback → static template, per your instruction (previously it was Gemini-first).

**`backend/analytics/analytics_service.py`**
- Added `tickets_today`, `escalated_tickets`, `resolution_rate` to `/analytics/summary` — all computed from your real `Ticket` table. (Customer Satisfaction % and Avg Response time were **not** added back — your schema doesn't track either, and I didn't want to fabricate numbers. See "Not done" below if you want these tracked for real.)

## Frontend

**`frontend/js/auth-guard.js`** (the actual root of Issues 1, 3, 4)
- Added `logout()` — this didn't exist before; `sidebar.html` and `settings.js` were calling a function that threw a silent error, so logout never worked.
- Added `getUserEmail()` alias — `settings.js` called this but only `getEmail()` existed.
- `requireAuth()` now actually runs automatically on every page load (it was defined but never called anywhere before). Pages in the public allowlist (`login.html`, `index.html`, root `/`) are skipped.
- Added `getCurrentUser()` / `initProfileBadges()` — fetches `/auth/me` once per page and fills in any `.profile`/`.profile-avatar` element plus `#profileName`/`#profileRole`/`#profileEmail`/`#welcomeMessage` if present, replacing the old hardcoded "HM"/"Sarah Johnson" text everywhere automatically.

**`frontend/vercel.json` + `frontend/index.html`**
- Root `/` now rewrites to `index.html` (was rewriting straight to `chat.html`, bypassing all auth logic — this was Issue 1's actual cause).
- `index.html` now redirects to `login.html` if there's no token (before it only handled the logged-in case).

**`frontend/login.html`**
- Already-logged-in users hitting `login.html` directly now get bounced to the dashboard instead of seeing the login form again.

**`frontend/js/dashboard.js`** (was a 0-byte empty file, and wasn't even linked from `dashboard.html`)
- Written from scratch. Pulls stat cards from `/analytics/summary` and a "recent activity" feed from `/tickets`.

**`frontend/dashboard.html`**
- Hardcoded numbers replaced with real IDs (`statTicketsToday`, `statResolved`, `statActive`, `statEscalated`) filled in by `dashboard.js`.
- Repurposed the "Customer Satisfaction" and "Avg Response" cards to "Active Tickets" and "Escalated" — real data, since satisfaction/response-time aren't tracked anywhere in your backend and I didn't want to fake them.
- Added `id="welcomeMessage"` so it becomes "Welcome, Honey" once logged in.

**`frontend/sentiment.html` + `frontend/js/sentiment.js`**
- This was the one page with **no auth-guard include at all** — fully public, and running 100% fake local keyword matching (never touched your backend). Now protected and wired to the real `/classify` endpoint, same pattern as `intent.js`.

**`frontend/js/chat.js`**
- The escalation button called `alert(...)` and did nothing else. Now calls `POST /tickets/escalate` for real, updates the ticket panel, and shows the real ticket ID.

**`frontend/settings.html` + `frontend/js/settings.js`**
- Added `#profileName` / `#profileRole` / `#profileAvatar` ids, wired to real `getCurrentUser()` data instead of hardcoded "Honey M / Administrator / admin@supportai.com".

## Confirmed NOT broken (left alone)
`analytics.js`, `tickets.js`, `reports.js`, `knowledge-retrieval.js`, `intent.js` were already correctly calling your real backend endpoints via `authFetch`. No changes needed there.

## Still needs your attention (can't be fixed in code)
1. **Gemini in production** — your `.env` has a real `GEMINI_API_KEY` locally, but that file isn't deployed to Render. If Render's environment variables don't include it, the deployed backend silently runs in KB-only/offline mode, which matches the symptom you described. Check Render → your service → Environment, and add `GEMINI_API_KEY`, `GEMINI_MODEL`, `JWT_SECRET_KEY`, `DATABASE_URL` there.
2. **Customer Satisfaction / Avg Response time** — not tracked anywhere in the current schema. If you want these back for real (not faked), that needs: a response-timestamp field on `Message`/`Ticket` for avg response time, and either a post-chat rating prompt or ticket-close survey for CSAT.
