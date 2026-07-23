/* ==========================================
   ANALYTICS DASHBOARD (live, backed by /analytics/summary)
========================================== */

const API_BASE_URL = "https://ai-customer-support-backend-pard.onrender.com";

let categoryChartInstance = null;
let sentimentChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    initializeLucide();
    loadSidebar();
    initializeStaticTicketChart(); // demo chart -- backend has no month-grouping endpoint yet
    loadAnalyticsData();
    initializeTheme();
    initializeNotifications();
    initializeProfile();
});

/* ==========================================
   LUCIDE ICONS
========================================== */

function initializeLucide() {
    if (window.lucide) {
        lucide.createIcons();
    }
}

/* ==========================================
   LOAD SIDEBAR
========================================== */

function loadSidebar() {
    const sidebar = document.getElementById("sidebar-container");

    if (!sidebar) return;

    fetch("components/sidebar.html")
        .then(response => response.text())
        .then(html => {
            sidebar.innerHTML = html;
            initializeLucide();
        })
        .catch(error => {
            console.error("Sidebar loading failed:", error);
        });
}

/* ==========================================
   FETCH REAL ANALYTICS DATA
========================================== */

function loadAnalyticsData() {

    window.SupportAIAuth.authFetch(`${API_BASE_URL}/analytics/summary`)
        .then(response => {
            if (!response.ok) throw new Error(`Server responded with ${response.status}`);
            return response.json();
        })
        .then(data => {
            updateKpiCards(data);
            updateCategoryChart(data.category_distribution);
            updateSentimentChart(data.sentiment_distribution);
        })
        .catch(error => {
            console.error("Failed to load analytics:", error);
            const ids = ["statTotalTickets", "statResolved", "statAutoResolved", "statOpenTickets"];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = "Error";
            });
        });

}

/* ==========================================
   UPDATE KPI CARDS WITH REAL NUMBERS
========================================== */

function updateKpiCards(data) {

    const total = data.total_tickets;
    const resolved = data.resolved_tickets;
    const open = data.active_tickets;
    const conversations = data.total_conversations;

    setText("statTotalTickets", total);
    setText("statResolved", resolved);
    setText("statOpenTickets", open);

    setText("statTotalTicketsSub", `${conversations} total conversations`);

    const resolvedPct = total > 0 ? Math.round((resolved / total) * 100) : 0;
    setText("statResolvedSub", `${resolvedPct}%`);

    // Real, derived metric: conversations the AI closed without ever creating a ticket
    const autoResolved = Math.max(conversations - total, 0);
    const autoResolvedPct = conversations > 0 ? Math.round((autoResolved / conversations) * 100) : 0;
    setText("statAutoResolved", `${autoResolvedPct}%`);

}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

/* ==========================================
   CATEGORY DOUGHNUT CHART (real data)
========================================== */

function updateCategoryChart(categoryDistribution) {

    const canvas = document.getElementById("categoryChart");
    if (!canvas) return;

    const entries = Object.entries(categoryDistribution || {});
    const labels = entries.length ? entries.map(e => e[0]) : ["No tickets yet"];
    const values = entries.length ? entries.map(e => e[1]) : [1];
    const palette = ["#4F46E5", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

    if (categoryChartInstance) categoryChartInstance.destroy();

    categoryChartInstance = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: labels.map((_, i) => palette[i % palette.length])
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: "bottom" }
            }
        }
    });

}

/* ==========================================
   SENTIMENT BAR CHART (real data)
========================================== */

function updateSentimentChart(sentimentDistribution) {

    const canvas = document.getElementById("sentimentChart");
    if (!canvas) return;

    const dist = sentimentDistribution || { positive: 0, neutral: 0, negative: 0 };

    if (sentimentChartInstance) sentimentChartInstance.destroy();

    sentimentChartInstance = new Chart(canvas, {
        type: "bar",
        data: {
            labels: ["Positive", "Neutral", "Negative"],
            datasets: [{
                label: "Tickets",
                data: [dist.positive || 0, dist.neutral || 0, dist.negative || 0],
                backgroundColor: ["#10B981", "#3B82F6", "#EF4444"]
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });

}

/* ==========================================
   MONTHLY TREND CHART -- DEMO DATA
   (Backend has no "group tickets by month" endpoint yet.
   Ask to add one if you want this to be live too.)
========================================== */

function initializeStaticTicketChart() {

    const canvas = document.getElementById("ticketChart");
    if (!canvas) return;

    new Chart(canvas, {
        type: "line",
        data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            datasets: [{
                label: "Tickets (demo)",
                data: [420, 510, 480, 620, 710, 820],
                borderColor: "#4F46E5",
                backgroundColor: "rgba(79,70,229,.15)",
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });

}

/* ==========================================
   DARK MODE
========================================== */

function initializeTheme() {
    const buttons = document.querySelectorAll(".icon-btn");
    if (buttons.length < 2) return;
    buttons[1].addEventListener("click", () => {
        document.body.classList.toggle("dark");
    });
}

/* ==========================================
   NOTIFICATIONS
========================================== */

function initializeNotifications() {
    const buttons = document.querySelectorAll(".icon-btn");
    if (buttons.length === 0) return;
    buttons[0].addEventListener("click", () => {
        alert("No new analytics notifications.");
    });
}

/* ==========================================
   PROFILE
========================================== */

function initializeProfile() {
    const profile = document.querySelector(".profile");
    if (!profile) return;
    profile.addEventListener("click", () => {
        alert("Profile settings coming soon.");
    });
}
