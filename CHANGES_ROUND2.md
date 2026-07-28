# Round 2 — Auth & User Management fixes

## Root cause of most of this round's symptoms
`/auth/me` and `/tickets/escalate` were **brand-new endpoints added in round 1**
that never existed in your original backend. Since only the local backend was
updated (not redeployed to Render), the frontend — pointed at the same
Render URL as before — was calling endpoints that returned 404 there. That
alone explains the stuck "Loading..." on Settings, the profile never
updating, and the escalate button doing nothing.

**Action needed on your end: redeploy the backend to Render before testing
again.** Everything below assumes that happens.

## Real code changes made this round

**`backend/database.py`**
- Added real `name`, `role`, `is_admin` columns to `User` (per your go-ahead — previously we only derived a name from the email).
- Added `_run_lightweight_migrations()` so your **existing** `support.db` / Postgres database gets these new columns added automatically on next startup, without wiping any existing users. `Base.metadata.create_all()` alone would NOT have done this — it only creates missing tables, never adds columns to a table that already exists on disk.

**`backend/main.py`**
- `/auth/signup` now accepts an optional `name`, and makes the **first user ever created an admin** (`is_admin=True`, role "Administrator") — so you have an account to test the admin endpoint with immediately, without manual DB edits.
- `/auth/me` (GET) now returns the real stored `name`/`role` (falling back to the email-derived name only if not set yet), plus `is_admin`.
- Added `/auth/me` (PUT) — real profile editing, persists to the database.
- Added `/admin/users` (GET) — lists all registered users (`id`, `email`, `name`, `role`, `is_admin`, `created_at`). Restricted to `is_admin` users (403 otherwise). Note: there's no "status" (active/suspended) concept in your schema — I didn't fabricate one. Let me know if you want account suspension as a real feature.

**`frontend/js/auth-guard.js`**
- `authFetch()` now also treats a `403` as "not logged in" when no token was sent (FastAPI's `HTTPBearer` returns 403, not 401, when the Authorization header is missing entirely — a real edge case that was previously unhandled).
- Added `refreshCurrentUser()` — busts the cached profile and re-applies it to the page immediately after an edit, instead of waiting for the next page load.

**`frontend/js/settings.js`**
- "Edit Profile" button now actually works — prompts for name/role, calls `PUT /auth/me`, saves to the database, and refreshes the on-screen profile card immediately.
- If the profile fails to load, it now says "Couldn't load profile" instead of hanging on "Loading..." forever, and logs the real error to the console so it's diagnosable.

## Not changed (still your call)
- Signup form still only collects email/password (no name field) — you can add one to `login.html`'s signup form if you want it collected at signup, but since you can now edit your name in Settings afterward, it's optional.
- No "Status" (active/suspended) field for the admin user list — schema doesn't support it yet.
