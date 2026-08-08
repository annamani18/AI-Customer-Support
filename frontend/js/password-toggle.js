/* ==========================================================
   PASSWORD-TOGGLE.JS
   Additive only. Wires up the eye icon inside any
   .password-wrapper to show/hide that field's password.
   Does not touch login.js or any existing form-submit logic —
   it only ever changes the input's "type" attribute.
========================================================== */

(function () {

    function initPasswordToggles() {
        document.querySelectorAll(".toggle-password").forEach((btn) => {
            if (btn.dataset.wired) return; // avoid double-binding if called twice
            btn.dataset.wired = "true";

            btn.addEventListener("click", () => {
                const targetId = btn.getAttribute("data-target");
                const input = targetId ? document.getElementById(targetId) : btn.previousElementSibling;
                if (!input) return;

                const isHidden = input.type === "password";
                input.type = isHidden ? "text" : "password";

                btn.innerHTML = isHidden
                    ? '<i data-lucide="eye-off"></i>'
                    : '<i data-lucide="eye"></i>';

                if (window.lucide) window.lucide.createIcons();
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initPasswordToggles);
    } else {
        initPasswordToggles();
    }

})();
