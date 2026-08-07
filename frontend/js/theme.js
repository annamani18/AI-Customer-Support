/* ==========================================
   THEME.JS — reusable dark-mode toggle
   Drop <script src="js/theme.js"></script> onto any
   page that doesn't already wire up its own theme
   toggle, and it will:
     1. Restore the saved theme on load
     2. Wire the page's moon/sun icon button to toggle it
     3. Persist the choice in localStorage
   Applies both "dark" and "dark-mode" classes to <body>
   so it works with existing CSS in either page-specific
   files (which use body.dark) or style.css (body.dark-mode).
========================================== */

(function () {

    const STORAGE_KEY = "supportai-theme"; // "dark" | "light"

    function applyTheme(theme) {
        const isDark = theme === "dark";
        document.body.classList.toggle("dark", isDark);
        document.body.classList.toggle("dark-mode", isDark);
    }

    function currentTheme() {
        return localStorage.getItem(STORAGE_KEY) || "light";
    }

    function setTheme(theme) {
        localStorage.setItem(STORAGE_KEY, theme);
        applyTheme(theme);
    }

    function toggleTheme() {
        setTheme(currentTheme() === "dark" ? "light" : "dark");
    }

    function findToggleButton() {
        const moonIcon = document.querySelector('[data-lucide="moon"], [data-lucide="sun"]');
        if (moonIcon) return moonIcon.closest("button");
        return document.querySelector('.theme-toggle, .mode-switch, #theme-toggle, .dark-light-toggle');
    }

    function init() {
        applyTheme(currentTheme());

        const btn = findToggleButton();
        if (!btn) return;

        btn.addEventListener("click", (e) => {
            e.preventDefault();
            toggleTheme();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    window.SupportAITheme = { setTheme, toggleTheme, currentTheme };

})();
