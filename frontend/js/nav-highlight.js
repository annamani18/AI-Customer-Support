/* ==========================================================
   NAV-HIGHLIGHT.JS
   Additive only. The sidebar (components/sidebar.html) already
   has data-page="xxx.html" on each menu item but nothing was
   setting the .active class. This adds it based on the current
   URL, after the sidebar has been fetched into the page.
   Does not touch any existing script, id, or class definition.
========================================================== */

(function () {

    function highlightActiveNav() {
        const currentPage = window.location.pathname.split("/").pop() || "dashboard.html";
        document.querySelectorAll(".menu li[data-page]").forEach((li) => {
            if (li.getAttribute("data-page") === currentPage) {
                li.classList.add("active");
            } else {
                li.classList.remove("active");
            }
        });
    }

    // Sidebar is loaded async via fetch() in each page, so poll briefly
    // for it to exist rather than assuming a fixed timing.
    function waitForSidebar(attemptsLeft) {
        if (document.querySelector(".menu li[data-page]")) {
            highlightActiveNav();
            return;
        }
        if (attemptsLeft <= 0) return;
        setTimeout(() => waitForSidebar(attemptsLeft - 1), 100);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => waitForSidebar(20));
    } else {
        waitForSidebar(20);
    }

})();
