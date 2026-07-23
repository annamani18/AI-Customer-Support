/* ==========================================
   AI CUSTOMER SUPPORT ASSISTANT
   CHAT.JS
========================================== */

// Point this at your backend. Change for deployment.
const API_BASE_URL = "http://127.0.0.1:8000";

// Keeps the backend's conversation_id so replies stay in context.
let currentConversationId = null;

document.addEventListener("DOMContentLoaded", () => {

    // Initialize Lucide Icons
    lucide.createIcons();

    // Load Sidebar
    loadSidebar();

    // Initialize Features
    initializeChat();
    initializeConversationList();
    initializeThemeToggle();
    initializeNotification();
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
    .then(data=>{

        sidebar.innerHTML=data;

        lucide.createIcons();

    });

}


/* ==========================================
   CHAT FUNCTIONS
========================================== */

function initializeChat(){

    const input=document.querySelector(".message-box input");

    const sendBtn=document.querySelector(".send-btn");

    if(!input || !sendBtn) return;

    sendBtn.addEventListener("click",sendMessage);

    input.addEventListener("keypress",function(e){

        if(e.key==="Enter"){

            e.preventDefault();

            sendMessage();

        }

    });

}


/* ==========================================
   SEND MESSAGE
========================================== */

function sendMessage(){

    const input=document.querySelector(".message-box input");

    const messages=document.querySelector(".messages");

    const text=input.value.trim();

    if(text==="") return;

    const message=document.createElement("div");

    message.className="message customer";

    message.innerHTML=`

        <p>${text}</p>

        <span>${currentTime()}</span>

    `;

    messages.appendChild(message);

    input.value="";

    scrollBottom();

    showTyping(text);

}
/* ==========================================
   AI TYPING
========================================== */

function showTyping(customerText){

    const messages=document.querySelector(".messages");

    const typing=document.createElement("div");

    typing.className="message ai typing";

    typing.innerHTML=`

        <p>

            AI is typing<span class="dots">...</span>

        </p>

    `;

    messages.appendChild(typing);

    scrollBottom();

    fetchAiReply(customerText)
    .then((data) => {

        typing.remove();

        renderAiReply(data.reply, data.sources, data.classification);

        updateCustomerPanel(data.classification, data.ticketId);

        if(data.classification && data.classification.escalate){

            renderEscalationBanner(data.classification.escalationReason);

        }

    })
    .catch((error) => {

        typing.remove();

        renderAiReply("Sorry, I couldn't reach the support server. Please try again in a moment.", [], null);

        console.error("Chat request failed:", error);

    });

}


/* ==========================================
   AI RESPONSE (real backend call)
========================================== */

function fetchAiReply(customerText){

    return window.SupportAIAuth.authFetch(`${API_BASE_URL}/chat`, {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

            message: customerText,

            conversation_id: currentConversationId

        })

    })
    .then((response) => {

        if(!response.ok) throw new Error(`Server responded with ${response.status}`);

        return response.json();

    })
    .then((data) => {

        currentConversationId = data.conversation_id;

        return {
            reply: data.reply,
            sources: data.sources || [],
            ticketId: data.ticket_id || null,
            classification: {
                intent: data.intent,
                category: data.category,
                urgency: data.urgency,
                sentiment: data.sentiment,
                sentimentScore: data.sentiment_score,
                emotion: data.emotion,
                escalate: data.escalate,
                escalationReason: data.escalation_reason
            }
        };

    });

}


function renderAiReply(replyText, sources, classification){

    const messages=document.querySelector(".messages");

    const reply=document.createElement("div");

    reply.className="message ai";

    const sourcesLine = (sources && sources.length)
        ? `<span class="sources">Based on: ${sources.join(", ")}</span>`
        : "";

    const badgeLine = classification
        ? `<span class="ticket-badge urgency-${classification.urgency}">${classification.category} &middot; ${classification.urgency} urgency</span>
           <span class="sentiment-badge sentiment-${classification.sentiment}">${classification.emotion}</span>`
        : "";

    reply.innerHTML=`

        <p>${replyText}</p>

        <div class="badge-row">${badgeLine}</div>

        ${sourcesLine}

        <span>${currentTime()}</span>

    `;

    messages.appendChild(reply);

    scrollBottom();

}


/* ==========================================
   ESCALATION BANNER
========================================== */

function renderEscalationBanner(reason){

    const messages=document.querySelector(".messages");

    const banner=document.createElement("div");

    banner.className="message escalation";

    banner.innerHTML=`

        <p>This conversation may need a human agent${reason ? ` &mdash; ${reason}` : ""}.</p>

        <button class="escalate-btn" type="button">Connect me to a human agent</button>

    `;

    banner.querySelector(".escalate-btn").addEventListener("click", () => {

        alert("Connecting you to a support agent. (Live handoff comes with the queueing/notifications work in a later phase.)");

    });

    messages.appendChild(banner);

    scrollBottom();

}
/* ==========================================
   CONVERSATION LIST
========================================== */

function initializeConversationList(){

    const items=document.querySelectorAll(".history-item");

    items.forEach(item=>{

        item.addEventListener("click",()=>{

            items.forEach(i=>i.classList.remove("active"));

            item.classList.add("active");

        });

    });

}


/* ==========================================
   NEW CHAT
========================================== */

const newChat=document.querySelector(".new-chat-btn");

if(newChat){

    newChat.addEventListener("click",()=>{

        const messages=document.querySelector(".messages");

        messages.innerHTML="";

        currentConversationId = null;

        updateCustomerPanel({ urgency: "low", intent: "General Inquiry", sentiment: "neutral", escalate: false }, null);

    });

}
/* ==========================================
   DARK MODE
========================================== */

function initializeThemeToggle(){

    const themeBtn=document.querySelectorAll(".icon-btn")[1];

    if(!themeBtn) return;

    themeBtn.addEventListener("click",()=>{

        document.body.classList.toggle("dark");

    });

}


/* ==========================================
   NOTIFICATION
========================================== */

function initializeNotification(){

    const notify=document.querySelectorAll(".icon-btn")[0];

    if(!notify) return;

    notify.addEventListener("click",()=>{

        alert("No new notifications.");

    });

}


/* ==========================================
   PROFILE
========================================== */

function initializeProfile(){

    const profile=document.querySelector(".profile");

    if(!profile) return;

    profile.addEventListener("click",()=>{

        alert("Profile menu coming soon.");

    });

}
/* ==========================================
   CUSTOMER DETAILS PANEL (live data)
========================================== */

function updateCustomerPanel(classification, ticketId){

    if(!classification) return;

    const sentimentEmoji = { positive: "😊", neutral: "😐", negative: "😟" };

    const priorityEmoji = { high: "🔴", medium: "🟠", low: "🟢" };

    const ticketEl = document.getElementById("panelTicketId");

    const priorityEl = document.getElementById("panelPriority");

    const statusEl = document.getElementById("panelStatus");

    const intentEl = document.getElementById("panelIntent");

    const sentimentEl = document.getElementById("panelSentiment");

    const escalationEl = document.getElementById("panelEscalation");

    if(ticketEl){

        ticketEl.textContent = ticketId ? `#${ticketId.slice(0, 8).toUpperCase()}` : "No ticket yet";

    }

    if(priorityEl){

        const urgency = classification.urgency || "low";

        priorityEl.textContent = `${capitalizeWord(urgency)} ${priorityEmoji[urgency] || ""}`;

    }

    if(statusEl){

        statusEl.textContent = ticketId ? "Open" : "—";

    }

    if(intentEl){

        intentEl.textContent = classification.intent || "General Inquiry";

    }

    if(sentimentEl){

        const sentiment = classification.sentiment || "neutral";

        sentimentEl.textContent = `${sentimentEmoji[sentiment] || ""} ${capitalizeWord(sentiment)}`;

    }

    if(escalationEl){

        escalationEl.textContent = classification.escalate ? "Required" : "Not Required";

    }

}

function capitalizeWord(str){

    if(!str) return "";

    return str.charAt(0).toUpperCase() + str.slice(1);

}

/* ==========================================
   HELPERS
========================================== */

function scrollBottom(){

    const messages=document.querySelector(".messages");

    messages.scrollTop=messages.scrollHeight;

}

function currentTime(){

    const now=new Date();

    return now.toLocaleTimeString([],{

        hour:"2-digit",

        minute:"2-digit"

    });

}
