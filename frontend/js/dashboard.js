/* ==========================================
   AI CUSTOMER SUPPORT ASSISTANT
   DASHBOARD.JS
   Pulls real numbers from the backend instead
   of the old hardcoded stat cards.
========================================== */

const API_BASE_URL = "https://ai-customer-support-backend-pard.onrender.com";

document.addEventListener("DOMContentLoaded", () => {

    lucide.createIcons();

    loadSidebar();
    initializeThemeToggle();
    initializeNotification();

    loadDashboardStats();
    loadRecentActivity();

});


/* ==========================================
   LOAD SIDEBAR
========================================== */

function loadSidebar(){

    const sidebar = document.getElementById("sidebar-container");

    if(!sidebar) return;

    fetch("components/sidebar.html")
        .then(response => response.text())
        .then(data => {
            sidebar.innerHTML = data;
            lucide.createIcons();
        })
        .catch(error => console.error("Sidebar error:", error));

}


/* ==========================================
   STAT CARDS (real data from /analytics/summary)
========================================== */

function loadDashboardStats(){

    window.SupportAIAuth.authFetch(`${API_BASE_URL}/analytics/summary`)
        .then(response => {
            if(!response.ok) throw new Error(`Server responded with ${response.status}`);
            return response.json();
        })
        .then(data => {

            setStat("statTicketsToday", data.tickets_today, "statTicketsTodayTag", "Today");
            setStat("statResolved", data.resolved_tickets, "statResolvedTag",
                data.total_tickets ? `${data.resolution_rate}% of total` : "No tickets yet");
            setStat("statActive", data.active_tickets, "statActiveTag", "Open now");
            setStat("statEscalated", data.escalated_tickets, "statEscalatedTag", "Needs a human");

        })
        .catch(error => {
            console.error("Dashboard stats error:", error);
            ["statTicketsToday", "statResolved", "statActive", "statEscalated"].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.textContent = "—";
            });
            ["statTicketsTodayTag", "statResolvedTag", "statActiveTag", "statEscalatedTag"].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.textContent = "Couldn't load";
            });
        });

}

function setStat(valueId, value, tagId, tagText){
    const valueEl = document.getElementById(valueId);
    const tagEl = document.getElementById(tagId);
    if(valueEl) valueEl.textContent = (value === undefined || value === null) ? "0" : value;
    if(tagEl) tagEl.textContent = tagText;
}


/* ==========================================
   RECENT ACTIVITY (derived from real tickets)
========================================== */

function loadRecentActivity(){

    const list = document.getElementById("recentActivityList");

    if(!list) return;

    window.SupportAIAuth.authFetch(`${API_BASE_URL}/tickets`)
        .then(response => {
            if(!response.ok) throw new Error(`Server responded with ${response.status}`);
            return response.json();
        })
        .then(tickets => {

            if(!tickets || tickets.length === 0){
                list.innerHTML = `<li>No activity yet — tickets will show up here.</li>`;
                return;
            }

            const statusIcon = { open: "🟢", pending: "🟠", resolved: "✅", escalated: "⚠️" };

            const recent = tickets.slice(0, 5);

            list.innerHTML = recent.map(t => {
                const icon = statusIcon[t.status] || "•";
                const shortId = t.id ? t.id.slice(0, 8).toUpperCase() : "—";
                return `<li>${icon} Ticket #${shortId} — ${t.category || "General"} (${t.status})</li>`;
            }).join("");

        })
        .catch(error => {
            console.error("Recent activity error:", error);
            list.innerHTML = `<li>Couldn't load recent activity.</li>`;
        });

}


/* ==========================================
   THEME + NOTIFICATIONS (unchanged behaviour)
========================================== */

function initializeThemeToggle(){
    const themeBtn = document.querySelectorAll(".icon-btn")[2];
    if(!themeBtn) return;
    themeBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark");
    });
}

function initializeNotification(){
    const notifyBtn = document.querySelectorAll(".icon-btn")[1];
    if(!notifyBtn) return;
    notifyBtn.addEventListener("click", () => {
        alert("No new notifications.");
    });
}
