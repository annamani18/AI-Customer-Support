/* ==========================================
   AUTH GUARD
   Stores the JWT from login/signup, wraps
   fetch() so every backend call carries the
   Authorization header automatically, and
   enforces login on every protected page.
========================================== */

(function () {

    const TOKEN_KEY = "supportai_access_token";
    const EMAIL_KEY = "supportai_email";
    const LOGIN_PAGE = "login.html";
    const API_BASE_URL = "https://ai-customer-support-backend-pard.onrender.com";

    // Pages that should NOT be bounced to login.html automatically.
    // "" covers the root path ("/") when Vercel rewrites it internally.
    const PUBLIC_PAGES = ["login.html", "index.html", ""];

    let cachedUser = null;

    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function getEmail() {
        return localStorage.getItem(EMAIL_KEY);
    }

    // Alias kept for pages/scripts that call getUserEmail() instead of getEmail().
    function getUserEmail() {
        return getEmail();
    }

    function setToken(token) {
        localStorage.setItem(TOKEN_KEY, token);
    }

    // Called by login.js / signup after a successful /auth/login or /auth/signup
    function setSession(token, email) {
        localStorage.setItem(TOKEN_KEY, token);
        if (email) {
            localStorage.setItem(EMAIL_KEY, email);
        }
        cachedUser = null;
    }

    function clearToken() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EMAIL_KEY);
        cachedUser = null;
    }

    function clearSession() {
        clearToken();
    }

    // Fully logs the user out and sends them back to login.html.
    // This is the function sidebar.html / settings.js actually call.
    function logout() {
        clearSession();
        window.location.href = LOGIN_PAGE;
    }

    // Redirect to login if there's no token at all (page-load guard).
    function requireAuth() {
        if (!getToken()) {
            window.location.href = LOGIN_PAGE;
        }
    }

    // Drop-in replacement for fetch() that adds the Authorization header
    // and bounces to login if the token is missing/expired (401).
    function authFetch(url, options = {}) {

        const token = getToken();

        const headers = Object.assign({}, options.headers || {});

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        return fetch(url, Object.assign({}, options, { headers }))
            .then((response) => {

                // FastAPI's HTTPBearer returns 403 when the Authorization
                // header is missing entirely, and our own get_current_user
                // raises 401 for an invalid/expired token. Treat both as
                // "not logged in" so neither case gets silently swallowed.
                if (response.status === 401 || (response.status === 403 && !token)) {
                    clearToken();
                    window.location.href = LOGIN_PAGE;
                }

                return response;

            });

    }

    // Fetches the logged-in user's profile (email/name/role/initials) from
    // the backend once per page load and caches it in memory.
    function getCurrentUser() {
        if (cachedUser) {
            return Promise.resolve(cachedUser);
        }
        if (!getToken()) {
            return Promise.resolve(null);
        }
        return authFetch(`${API_BASE_URL}/auth/me`)
            .then((response) => (response.ok ? response.json() : null))
            .then((user) => {
                cachedUser = user;
                return user;
            })
            .catch(() => null);
    }

    // Fills in any element with class "profile"/"profile-avatar" (initials)
    // or id "profileName"/"profileRole"/"profileEmail" found on the page,
    // replacing the old static "HM" / "Sarah Johnson" placeholders.
    function initProfileBadges() {
        getCurrentUser().then((user) => {
            if (!user) return;

            document.querySelectorAll(".profile, .profile-avatar").forEach((el) => {
                el.textContent = user.initials;
                el.title = `${user.name} · ${user.email}`;
            });

            const nameEl = document.getElementById("profileName");
            if (nameEl) nameEl.textContent = user.name;

            const roleEl = document.getElementById("profileRole");
            if (roleEl) roleEl.textContent = user.role;

            const emailEl = document.getElementById("profileEmail");
            if (emailEl) emailEl.textContent = user.email;

            const welcomeEl = document.getElementById("welcomeMessage");
            if (welcomeEl) welcomeEl.textContent = `Welcome, ${user.name}`;
        });
    }

    // Clears the cached profile and re-fetches + re-applies it to the page
    // (call this after a profile edit so the new name/initials show up
    // immediately instead of waiting for the next page load).
    function refreshCurrentUser() {
        cachedUser = null;
        return getCurrentUser().then((user) => {
            initProfileBadges();
            return user;
        });
    }

    window.SupportAIAuth = {
        getToken,
        getEmail,
        getUserEmail,
        setToken,
        setSession,
        clearToken,
        clearSession,
        logout,
        requireAuth,
        authFetch,
        getCurrentUser,
        refreshCurrentUser,
        initProfileBadges
    };

    // ---- Auto-enforce on every page that loads this script ----
    const currentPage = window.location.pathname.split("/").pop();

    if (!PUBLIC_PAGES.includes(currentPage)) {
        requireAuth();
    }

    document.addEventListener("DOMContentLoaded", () => {
        if (getToken() && !PUBLIC_PAGES.includes(currentPage)) {
            initProfileBadges();
        }
    });

})();
