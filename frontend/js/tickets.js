/* ==========================================
   AI CUSTOMER SUPPORT ASSISTANT
   TICKET.JS
========================================== */

const API_BASE_URL = "https://ai-customer-support-backend-pard.onrender.com";

document.addEventListener("DOMContentLoaded", () => {

    lucide.createIcons();

    loadSidebar();

    loadTickets();

    initializeCreateTicket();

});


/* ==========================================
   CREATE TICKET
========================================== */

function initializeCreateTicket(){

    const openBtn = document.querySelector(".create-ticket");
    const modal = document.getElementById("createTicketModal");
    const cancelBtn = document.getElementById("cancelCreateTicket");
    const form = document.getElementById("createTicketForm");

    if(!openBtn || !modal || !form) return;

    openBtn.addEventListener("click", () => {
        modal.style.display = "flex";
    });

    cancelBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    form.addEventListener("submit", (e) => {

        e.preventDefault();

        const subject = document.getElementById("ticketSubject").value.trim();
        const description = document.getElementById("ticketDescription").value.trim();
        const priority = document.getElementById("ticketPriority").value;

        if(!subject) return;

        window.SupportAIAuth.authFetch(`${API_BASE_URL}/tickets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subject, description, priority })
        })
        .then(response => {

            if(!response.ok) throw new Error(`Server responded with ${response.status}`);

            return response.json();

        })
        .then(() => {

            form.reset();
            modal.style.display = "none";
            loadTickets();

        })
        .catch(error => {

            console.error("Failed to create ticket:", error);
            alert("Couldn't create the ticket. Please try again.");

        });

    });

}


/* ==========================================
   LOAD SIDEBAR
========================================== */

function loadSidebar(){

    const sidebar = document.getElementById("sidebar-container");

    if(!sidebar) return;

    fetch("components/sidebar.html")
    .then(response => response.text())
    .then(data=>{

        sidebar.innerHTML=data;

        lucide.createIcons();

    });

}


/* ==========================================
   LOAD TICKETS
========================================== */

function loadTickets(){

    window.SupportAIAuth.authFetch(`${API_BASE_URL}/tickets`)
    .then(response => {

        if(!response.ok) throw new Error(`Server responded with ${response.status}`);

        return response.json();

    })
    .then(tickets => {

        renderStats(tickets);

        renderTable(tickets);

    })
    .catch(error => {

        console.error("Failed to load tickets:", error);

        const tbody = document.querySelector(".ticket-table tbody");

        if(tbody) tbody.innerHTML = emptyStateRow(
            "wifi-off",
            "Couldn't reach the support server",
            "Check your connection and try refreshing the page."
        );

    });

}


/* ==========================================
   KPI CARDS
========================================== */

function renderStats(tickets){

    const cards = document.querySelectorAll(".ticket-card h2");

    if(cards.length < 4) return;

    const total = tickets.length;

    const open = tickets.filter(t => t.status === "open").length;

    const resolved = tickets.filter(t => t.status === "resolved").length;

    const escalated = tickets.filter(t => t.escalate).length;

    cards[0].textContent = total;

    cards[1].textContent = open;

    cards[2].textContent = resolved;

    cards[3].textContent = escalated;

}


/* ==========================================
   TICKET TABLE
========================================== */

function renderTable(tickets){

    const tbody = document.querySelector(".ticket-table tbody");

    if(!tbody) return;

    if(tickets.length === 0){

        tbody.innerHTML = emptyStateRow(
            "ticket",
            "No tickets yet",
            "Tickets created from AI Chat or escalations will show up here."
        );

        lucide.createIcons();

        return;

    }

    tbody.innerHTML = tickets.map(ticketRow).join("");

    lucide.createIcons();

    tbody.querySelectorAll(".view-ticket").forEach(btn => {

        btn.addEventListener("click", () => viewTicket(btn.dataset.id));

    });

    tbody.querySelectorAll(".edit-ticket").forEach(btn => {

        btn.addEventListener("click", () => editTicketStatus(btn.dataset.id));

    });

}

function ticketRow(t){

    const shortId = t.id.slice(0, 8).toUpperCase();

    const priorityClass = t.urgency || "low";

    const statusClass = t.status || "open";

    const assignedTo = t.escalate ? "Human agent" : "AI Bot";

    return `
        <tr>
            <td data-label="Ticket ID">${shortId}</td>
            <td data-label="Customer">Web chat</td>
            <td data-label="Issue">${t.intent || "General inquiry"}</td>
            <td data-label="Priority"><span class="${priorityClass}">${capitalize(priorityClass)}</span></td>
            <td data-label="Status"><span class="${statusClass}">${capitalize(statusClass)}</span></td>
            <td data-label="Assigned To">${assignedTo}</td>
            <td data-label="Actions">
                <button class="view-ticket" data-id="${t.id}"><i data-lucide="eye"></i></button>
                <button class="edit-ticket" data-id="${t.id}"><i data-lucide="square-pen"></i></button>
            </td>
        </tr>
    `;

}

/* ==========================================
   EMPTY STATE ROW (presentation helper)
========================================== */

function emptyStateRow(icon, title, text){

    return `
        <tr>
            <td colspan="7" class="empty-state-cell">
                <div class="empty-state">
                    <div class="empty-state-icon"><i data-lucide="${icon}"></i></div>
                    <p class="empty-state-title">${title}</p>
                    <p class="empty-state-text">${text}</p>
                </div>
            </td>
        </tr>
    `;

}


/* ==========================================
   VIEW TICKET (transcript)
========================================== */

function viewTicket(ticketId){

    window.SupportAIAuth.authFetch(`${API_BASE_URL}/tickets/${ticketId}`)
    .then(response => {

        if(!response.ok) throw new Error(`Server responded with ${response.status}`);

        return response.json();

    })
    .then(ticket => {

        const transcript = ticket.messages
            .map(m => `${m.role === "customer" ? "Customer" : "AI"}: ${m.text}`)
            .join("\n\n");

        alert(
            `Ticket ${ticket.id.slice(0, 8).toUpperCase()}\n` +
            `Status: ${ticket.status} | Category: ${ticket.category} | Urgency: ${ticket.urgency}\n\n` +
            transcript
        );

    })
    .catch(error => console.error("Failed to load ticket:", error));

}


/* ==========================================
   EDIT TICKET STATUS
========================================== */

function editTicketStatus(ticketId){

    const input = prompt("Set status to: open, pending, resolved, or escalated");

    if(!input) return;

    const status = input.trim().toLowerCase();

    if(!["open", "pending", "resolved", "escalated"].includes(status)){

        alert("Invalid status. Use one of: open, pending, resolved, escalated.");

        return;

    }

    window.SupportAIAuth.authFetch(`${API_BASE_URL}/tickets/${ticketId}/status`, {

        method: "PATCH",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ status })

    })
    .then(response => {

        if(!response.ok) throw new Error(`Server responded with ${response.status}`);

        return response.json();

    })
    .then(() => loadTickets())
    .catch(error => console.error("Failed to update ticket status:", error));

}


/* ==========================================
   HELPERS
========================================== */

function capitalize(str){

    return str.charAt(0).toUpperCase() + str.slice(1);

}
