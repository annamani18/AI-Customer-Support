/* ==========================================
   AI CUSTOMER SUPPORT ASSISTANT
   MOBILE-NAV.JS
   Shared sidebar open/close behavior for phones
   and tablets. Included on every page that has
   the sidebar (#sidebar-container).

   Uses event delegation on `document` instead of
   grabbing elements on load, because the sidebar
   markup is injected later via fetch() on every
   page — a direct addEventListener on load would
   frequently miss the button entirely.
========================================== */

(function () {

    function getEls() {
        return {
            sidebar: document.getElementById("sidebarNav"),
            overlay: document.getElementById("sidebarOverlay"),
            toggleBtn: document.getElementById("mobileMenuToggle"),
        };
    }

    function openSidebar() {
        const { sidebar, overlay, toggleBtn } = getEls();
        if (!sidebar) return;
        sidebar.classList.add("open");
        if (overlay) overlay.classList.add("active");
        if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "true");
        document.body.classList.add("sidebar-open-lock");
    }

    function closeSidebar() {
        const { sidebar, overlay, toggleBtn } = getEls();
        if (!sidebar) return;
        sidebar.classList.remove("open");
        if (overlay) overlay.classList.remove("active");
        if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
        document.body.classList.remove("sidebar-open-lock");
    }

    function isSidebarOpen() {
        const { sidebar } = getEls();
        return !!sidebar && sidebar.classList.contains("open");
    }

    // Single delegated click handler covers: hamburger open,
    // X-button close, overlay click-to-close, and auto-close
    // after tapping a menu link (only relevant below 769px —
    // on tablet/desktop the sidebar isn't in overlay mode so
    // this is a no-op there).
    document.addEventListener("click", function (e) {
        if (e.target.closest("#mobileMenuToggle")) {
            isSidebarOpen() ? closeSidebar() : openSidebar();
            return;
        }

        if (e.target.closest("#sidebarClose")) {
            closeSidebar();
            return;
        }

        if (e.target.closest("#sidebarOverlay")) {
            closeSidebar();
            return;
        }

        const menuItem = e.target.closest(".sidebar .menu li");
        if (menuItem && window.innerWidth <= 768) {
            closeSidebar();
        }
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeSidebar();
    });

    // If the viewport is resized past mobile width while the
    // sidebar happens to be open, reset state so it doesn't
    // get stuck mid-transition or leave the scroll lock on.
    window.addEventListener("resize", function () {
        if (window.innerWidth > 768) closeSidebar();
    });

})();
