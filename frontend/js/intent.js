/* ==========================================
   AI CUSTOMER SUPPORT ASSISTANT
   INTENT DETECTION (live, backed by /classify)
========================================== */

const API_BASE_URL = "https://ai-customer-support-backend-pard.onrender.com";

document.addEventListener("DOMContentLoaded", () => {

    lucide.createIcons();
    loadSidebar();
    initializeAnalyzer();
    initializeTheme();
    initializeNotifications();
    initializeProfile();

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
    });

}

/* ==========================================
   ANALYZE BUTTON
========================================== */

function initializeAnalyzer(){

    const btn = document.getElementById("analyzeBtn");

    if(!btn) return;

    btn.addEventListener("click", analyzeMessage);

}

/* ==========================================
   ANALYZE MESSAGE (calls the real backend)
========================================== */

function analyzeMessage(){

    const textarea = document.getElementById("customerMessage");

    const message = textarea.value.trim();

    if(!message){
        showToast("Type a customer message first.");
        return;
    }

    const btn = document.getElementById("analyzeBtn");
    const originalLabel = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader"></i> Analyzing...`;
    lucide.createIcons();

    window.SupportAIAuth.authFetch(`${API_BASE_URL}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
    })
    .then(response => {
        if(!response.ok) throw new Error(`Server responded with ${response.status}`);
        return response.json();
    })
    .then(result => {
        updateResults(result, message);
        showToast("Intent analyzed successfully!");
    })
    .catch(error => {
        console.error("Classification failed:", error);
        showToast("Couldn't reach the AI backend. Is the server running?");
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = originalLabel;
        lucide.createIcons();
    });

}

/* ==========================================
   UPDATE UI WITH REAL RESULTS
========================================== */

function updateResults(data, originalMessage){

    document.getElementById("intentName").textContent = data.intent;

    // No numeric ML confidence exists in the backend, so this card
    // now honestly shows the detected category instead of a fake %.
    document.getElementById("confidence").textContent = data.category;

    document.getElementById("sentiment").textContent = capitalize(data.sentiment);

    document.getElementById("priority").textContent = capitalize(data.urgency);

    const recommendation = data.escalate
        ? `This needs human attention — ${data.escalation_reason}.`
        : `This can be safely handled by AI. Detected as a "${data.category.toLowerCase()}" issue with ${data.sentiment} sentiment.`;

    const action = data.escalate
        ? `Escalate to a human agent and create a ${data.category} ticket.`
        : `Continue automated resolution — no ticket needed.`;

    document.getElementById("recommendationText").textContent = recommendation;
    document.getElementById("actionText").textContent = action;

    prependHistoryRow(originalMessage, data);

}

/* ==========================================
   PREPEND A REAL ROW TO RECENT HISTORY TABLE
========================================== */

function prependHistoryRow(message, data){

    const tbody = document.querySelector(".history-card tbody");

    if(!tbody) return;

    const shortMsg = message.length > 24 ? message.slice(0, 24) + "…" : message;

    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${shortMsg}</td>
        <td>${data.intent}</td>
        <td>${capitalize(data.sentiment)}</td>
        <td>${capitalize(data.urgency)}</td>
    `;

    tbody.prepend(row);

}

/* ==========================================
   TOAST MESSAGE
========================================== */

function showToast(message){

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => { toast.classList.add("show"); }, 100);
    setTimeout(() => { toast.remove(); }, 3000);

}

/* ==========================================
   HELPERS
========================================== */

function capitalize(str){
    if(!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ==========================================
   THEME
========================================== */

function initializeTheme(){

    const buttons = document.querySelectorAll(".icon-btn");

    if(buttons.length < 2) return;

    buttons[1].addEventListener("click", () => {
        document.body.classList.toggle("dark");
    });

}

/* ==========================================
   NOTIFICATIONS
========================================== */

function initializeNotifications(){

    const buttons = document.querySelectorAll(".icon-btn");

    if(buttons.length === 0) return;

    buttons[0].addEventListener("click", () => {
        showToast("No new notifications.");
    });

}

/* ==========================================
   PROFILE
========================================== */

function initializeProfile(){

    const profile = document.querySelector(".profile");

    if(!profile) return;

    profile.addEventListener("click", () => {
        showToast("Profile settings coming soon.");
    });

}
