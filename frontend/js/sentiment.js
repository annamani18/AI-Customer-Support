/* ==========================================
   AI CUSTOMER SUPPORT ASSISTANT
   SENTIMENT ANALYSIS (live, backed by /classify)
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

    const sidebar=document.getElementById("sidebar-container");

    if(!sidebar) return;

    fetch("components/sidebar.html")

    .then(response=>response.text())

    .then(data=>{

        sidebar.innerHTML=data;

        lucide.createIcons();

    });

}
/* ==========================================
   ANALYZE BUTTON (calls the real backend)
========================================== */

function initializeAnalyzer(){

    const button=document.getElementById("analyzeSentiment");

    if(!button) return;

    button.addEventListener("click",analyzeSentiment);

}

function analyzeSentiment(){

    const message=document.getElementById("customerMessage").value.trim();

    if(!message){
        showToast("Type a customer message first.");
        return;
    }

    const button=document.getElementById("analyzeSentiment");
    const originalLabel=button.innerHTML;
    button.disabled=true;
    button.innerHTML=`<i data-lucide="loader"></i> Analyzing...`;
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
    .then(data => {
        updateResults(data);
        showToast("Sentiment analysis completed successfully!");
    })
    .catch(error => {
        console.error("Sentiment analysis failed:", error);
        showToast("Couldn't reach the AI backend. Is the server running?");
    })
    .finally(() => {
        button.disabled=false;
        button.innerHTML=originalLabel;
        lucide.createIcons();
    });

}
/* ==========================================
   UPDATE RESULTS WITH REAL BACKEND DATA
========================================== */

function updateResults(data){

    const sentimentEmoji = { positive: "😊", neutral: "😐", negative: "😟" };

    document.getElementById("sentimentResult").textContent =
        `${capitalize(data.sentiment)} ${sentimentEmoji[data.sentiment] || ""}`;

    // No numeric ML confidence exists in the backend, so this honestly
    // shows the detected category instead of a fabricated percentage.
    document.getElementById("confidenceResult").textContent = data.category;

    document.getElementById("priorityResult").textContent = capitalize(data.urgency);

    document.getElementById("emotionResult").textContent = data.emotion;

    document.getElementById("recommendationText").textContent = data.escalate
        ? `This customer needs human attention — ${data.escalation_reason}.`
        : `Continue assisting automatically. Detected as a "${data.category.toLowerCase()}" issue with ${data.sentiment} sentiment.`;

    document.getElementById("actionText").textContent = data.escalate
        ? "Escalate to a human agent"
        : "Continue AI-assisted resolution";

}
/* ==========================================
   TOAST
========================================== */

function showToast(message){

    const toast=document.createElement("div");

    toast.className="toast";

    toast.textContent=message;

    document.body.appendChild(toast);

    setTimeout(()=>{

        toast.classList.add("show");

    },100);

    setTimeout(()=>{

        toast.remove();

    },3000);

}
/* ==========================================
   UTILITIES
========================================== */

function capitalize(str){
    if(!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function initializeTheme(){

    const buttons=document.querySelectorAll(".icon-btn");

    if(buttons.length<2) return;

    buttons[1].addEventListener("click",()=>{

        document.body.classList.toggle("dark");

    });

}

function initializeNotifications(){

    const buttons=document.querySelectorAll(".icon-btn");

    if(buttons.length===0) return;

    buttons[0].addEventListener("click",()=>{

        showToast("No new notifications.");

    });

}

function initializeProfile(){

    const profile=document.querySelector(".profile");

    if(!profile) return;

    profile.addEventListener("click",()=>{

        showToast("Profile settings coming soon.");

    });

}
