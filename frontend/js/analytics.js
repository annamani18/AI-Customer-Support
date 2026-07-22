/* ==========================================
   ANALYTICS DASHBOARD
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    initializeLucide();
    loadSidebar();
    initializeCharts();
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

            if (window.lucide) {
                lucide.createIcons();
            }
        })
        .catch(error => {
            console.error("Sidebar loading failed:", error);
        });
}

/* ==========================================
   CHARTS
========================================== */

function initializeCharts() {

    initializeTicketChart();
    initializeCategoryChart();
    initializeSentimentChart();

}

/* ==========================================
   TICKET LINE CHART
========================================== */

function initializeTicketChart() {

    const canvas = document.getElementById("ticketChart");

    if (!canvas) return;

    new Chart(canvas, {
        type: "line",

        data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],

            datasets: [{
                label: "Tickets",
                data: [420, 510, 480, 620, 710, 820],

                borderColor: "#4F46E5",
                backgroundColor: "rgba(79,70,229,.15)",

                fill: true,
                tension: 0.4
            }]
        },

        options: {
            responsive: true,

            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

}

/* ==========================================
   CATEGORY DOUGHNUT CHART
========================================== */

function initializeCategoryChart() {

    const canvas = document.getElementById("categoryChart");

    if (!canvas) return;

    new Chart(canvas, {

        type: "doughnut",

        data: {

            labels: [
                "Refund",
                "Login",
                "Payment",
                "Shipping"
            ],

            datasets: [{
                data: [35, 25, 20, 20],

                backgroundColor: [
                    "#4F46E5",
                    "#06B6D4",
                    "#10B981",
                    "#F59E0B"
                ]
            }]
        },

        options: {

            responsive: true,

            plugins: {

                legend: {
                    position: "bottom"
                }

            }

        }

    });

}

/* ==========================================
   SENTIMENT BAR CHART
========================================== */

function initializeSentimentChart() {

    const canvas = document.getElementById("sentimentChart");

    if (!canvas) return;

    new Chart(canvas, {

        type: "bar",

        data: {

            labels: [
                "Positive",
                "Neutral",
                "Negative"
            ],

            datasets: [{
                label: "Messages",

                data: [540, 220, 110],

                backgroundColor: [
                    "#10B981",
                    "#3B82F6",
                    "#EF4444"
                ]
            }]
        },

        options: {

            responsive: true,

            plugins: {

                legend: {
                    display: false
                }

            },

            scales: {

                y: {
                    beginAtZero: true
                }

            }

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