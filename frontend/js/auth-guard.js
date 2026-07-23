/* ==========================================
   AUTH GUARD
   Stores the JWT from login/signup and wraps
   fetch() so every backend call carries the
   Authorization header automatically.
========================================== */

(function () {

    const TOKEN_KEY = "supportai_access_token";
    const EMAIL_KEY = "supportai_email";
    const LOGIN_PAGE = "login.html";

    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function getEmail() {
        return localStorage.getItem(EMAIL_KEY);
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
    }

    function clearToken() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EMAIL_KEY);
    }

    function clearSession() {
        clearToken();
    }

    // Redirect to login if there's no token at all (page-load guard).
    // Comment this out if you want guest/unauthenticated pages to load fine.
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

                if (response.status === 401) {
                    clearToken();
                    window.location.href = LOGIN_PAGE;
                }

                return response;

            });

    }

    window.SupportAIAuth = {
        getToken,
        getEmail,
        setToken,
        setSession,
        clearToken,
        clearSession,
        requireAuth,
        authFetch
    };

})();
