/* ==========================================
   REPORTS MODULE (live, backed by /analytics/summary + /tickets)
========================================== */

const API_BASE_URL = "https://ai-customer-support-backend-pard.onrender.com";

document.addEventListener("DOMContentLoaded", () => {

    initializeLucide();
    loadSidebar();
    initializeButtons();
    loadReportCards();
    initializeTheme();
    initializeNotifications();
    initializeProfile();

});

/* ==========================================
   LUCIDE ICONS
========================================== */

function initializeLucide(){
    if(window.lucide){
        lucide.createIcons();
    }
}

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
        initializeLucide();
    })
    .catch(error => {
        console.error("Sidebar Error:", error);
    });

}

/* ==========================================
   REPORT BUTTONS
========================================== */

function initializeButtons(){

    const generate = document.getElementById("generateBtn");
    const pdf = document.getElementById("pdfBtn");
    const csv = document.getElementById("csvBtn");

    if(generate) generate.addEventListener("click", generateReport);
    if(pdf) pdf.addEventListener("click", exportPDF);
    if(csv) csv.addEventListener("click", exportCSV);

}

/* ==========================================
   LOAD REAL NUMBERS INTO TOP CARDS
========================================== */

function loadReportCards(){

    Promise.all([
        window.SupportAIAuth.authFetch(`${API_BASE_URL}/analytics/summary`).then(r => {
            if(!r.ok) throw new Error(`Analytics: ${r.status}`);
            return r.json();
        }),
        window.SupportAIAuth.authFetch(`${API_BASE_URL}/tickets`).then(r => {
            if(!r.ok) throw new Error(`Tickets: ${r.status}`);
            return r.json();
        })
    ])
    .then(([summary, tickets]) => {
        renderCards(summary, tickets);
    })
    .catch(error => {
        console.error("Failed to load report cards:", error);
        ["statTotalTickets","statTicketsToday","statAutoResolvedPct","statSuccessRate"]
            .forEach(id => setText(id, "Error"));
    });

}

function renderCards(summary, tickets){

    const total = summary.total_tickets;
    const resolved = summary.resolved_tickets;
    const conversations = summary.total_conversations;

    setText("statTotalTickets", total);

    const todayStr = new Date().toISOString().slice(0, 10);
    const ticketsToday = tickets.filter(t => (t.created_at || "").slice(0, 10) === todayStr).length;
    setText("statTicketsToday", ticketsToday);

    const autoResolved = Math.max(conversations - total, 0);
    const autoResolvedPct = conversations > 0 ? Math.round((autoResolved / conversations) * 100) : 0;
    setText("statAutoResolvedPct", `${autoResolvedPct}%`);

    const successRate = total > 0 ? Math.round((resolved / total) * 100) : 100;
    setText("statSuccessRate", `${successRate}%`);

}

function setText(id, value){
    const el = document.getElementById(id);
    if(el) el.textContent = value;
}

/* ==========================================
   GENERATE REPORT (real summary text from live data)
========================================== */

function generateReport(){

    const summaryEl = document.getElementById("summaryText");
    const btn = document.getElementById("generateBtn");

    btn.disabled = true;

    Promise.all([
        window.SupportAIAuth.authFetch(`${API_BASE_URL}/analytics/summary`).then(r => {
            if(!r.ok) throw new Error(`Analytics: ${r.status}`);
            return r.json();
        }),
        window.SupportAIAuth.authFetch(`${API_BASE_URL}/tickets`).then(r => {
            if(!r.ok) throw new Error(`Tickets: ${r.status}`);
            return r.json();
        })
    ])
    .then(([summary, tickets]) => {

        const topCategory = Object.entries(summary.category_distribution || {})
            .sort((a, b) => b[1] - a[1])[0];

        const resolvedPct = summary.total_tickets > 0
            ? Math.round((summary.resolved_tickets / summary.total_tickets) * 100)
            : 100;

        const text =
            `The AI Customer Support Assistant has handled ${summary.total_conversations} conversations to date, ` +
            `generating ${summary.total_tickets} tickets (${summary.active_tickets} currently open, ${summary.resolved_tickets} resolved — ` +
            `a ${resolvedPct}% resolution rate). ` +
            (topCategory ? `The most common ticket category is "${topCategory[0]}" (${topCategory[1]} tickets). ` : "") +
            `Sentiment breakdown: ${summary.sentiment_distribution.positive} positive, ` +
            `${summary.sentiment_distribution.neutral} neutral, ${summary.sentiment_distribution.negative} negative.`;

        summaryEl.textContent = text;

        addHistoryRow("Generated Report");

        renderCards(summary, tickets);

        showToast("Report generated successfully.");

    })
    .catch(error => {
        console.error("Failed to generate report:", error);
        showToast("Couldn't reach the backend to generate the report.");
    })
    .finally(() => {
        btn.disabled = false;
    });

}

/* ==========================================
   EXPORT CSV (real ticket data)
========================================== */

function exportCSV(){

    window.SupportAIAuth.authFetch(`${API_BASE_URL}/tickets`)
    .then(response => {
        if(!response.ok) throw new Error(`Server responded with ${response.status}`);
        return response.json();
    })
    .then(tickets => {

        if(tickets.length === 0){
            showToast("No tickets to export yet.");
            return;
        }

        const header = ["ID", "Intent", "Category", "Urgency", "Sentiment", "Status", "Escalated", "Created At"];
        const rows = tickets.map(t => [
            t.id, t.intent, t.category, t.urgency, t.sentiment, t.status, t.escalate, t.created_at
        ]);

        const csv = [header, ...rows]
            .map(row => row.map(csvEscape).join(","))
            .join("\n");

        downloadBlob(csv, "tickets_report.csv", "text/csv");

        addHistoryRow("Exported CSV");

        showToast("CSV exported successfully.");

    })
    .catch(error => {
        console.error("Failed to export CSV:", error);
        showToast("Couldn't reach the backend to export CSV.");
    });

}

function csvEscape(value){
    const str = String(value ?? "");
    if(str.includes(",") || str.includes('"') || str.includes("\n")){
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function downloadBlob(content, filename, mimeType){
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/* ==========================================
   EXPORT PDF (real ticket + summary data via jsPDF)
========================================== */

function exportPDF(){

    if(!window.jspdf){
        showToast("PDF library failed to load. Check your internet connection.");
        return;
    }

    Promise.all([
        window.SupportAIAuth.authFetch(`${API_BASE_URL}/analytics/summary`).then(r => {
            if(!r.ok) throw new Error(`Analytics: ${r.status}`);
            return r.json();
        }),
        window.SupportAIAuth.authFetch(`${API_BASE_URL}/tickets`).then(r => {
            if(!r.ok) throw new Error(`Tickets: ${r.status}`);
            return r.json();
        })
    ])
    .then(([summary, tickets]) => {

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        let y = 15;
        doc.setFontSize(16);
        doc.text("AI Customer Support Assistant - Report", 14, y);
        y += 10;

        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y);
        y += 8;
        doc.text(`Total conversations: ${summary.total_conversations}`, 14, y);
        y += 6;
        doc.text(`Total tickets: ${summary.total_tickets} (open: ${summary.active_tickets}, resolved: ${summary.resolved_tickets})`, 14, y);
        y += 6;
        doc.text(`Sentiment: positive ${summary.sentiment_distribution.positive}, neutral ${summary.sentiment_distribution.neutral}, negative ${summary.sentiment_distribution.negative}`, 14, y);
        y += 10;

        doc.setFontSize(13);
        doc.text("Tickets", 14, y);
        y += 7;

        doc.setFontSize(9);
        tickets.slice(0, 40).forEach(t => {
            if(y > 280){
                doc.addPage();
                y = 15;
            }
            const line = `${t.id.slice(0, 8).toUpperCase()}  |  ${t.intent}  |  ${t.category}  |  ${t.urgency}  |  ${t.status}`;
            doc.text(line, 14, y);
            y += 6;
        });

        doc.save("tickets_report.pdf");

        addHistoryRow("Exported PDF");

        showToast("PDF exported successfully.");

    })
    .catch(error => {
        console.error("Failed to export PDF:", error);
        showToast("Couldn't reach the backend to export PDF.");
    });

}

/* ==========================================
   RECENT REPORTS TABLE
========================================== */

function addHistoryRow(action){

    const tbody = document.querySelector(".history-section tbody");
    if(!tbody) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${action}</td>
        <td>AI System</td>
        <td>${dateStr}</td>
        <td>Completed</td>
    `;

    tbody.prepend(row);

}

/* ==========================================
   TOAST
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
