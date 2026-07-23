/* ==========================================
   KNOWLEDGE RETRIEVAL
========================================== */

// If your AI Chat page's JS points at a different backend URL/port,
// change this constant to match it exactly.
const API_BASE_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", () => {

    lucide.createIcons();

    loadSidebar();

    initializeRetrieval();

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
   BUTTON
========================================== */

function initializeRetrieval(){

const button=document.getElementById("retrieveBtn");

if(!button) return;

button.addEventListener("click",retrieveKnowledge);

}
/* ==========================================
   RETRIEVE (live backend call)
========================================== */

async function retrieveKnowledge(){

    const queryInput=document.getElementById("customerQuery");
    const query=queryInput.value.trim();

    if(!query){
        showToast("Please enter a query first");
        return;
    }

    const button=document.getElementById("retrieveBtn");
    const originalLabel=button.innerHTML;
    button.disabled=true;
    button.innerHTML="<i data-lucide=\"loader\"></i> Retrieving...";
    lucide.createIcons();

    try{

        const response=await window.SupportAIAuth.authFetch(`${API_BASE_URL}/knowledge/search`,{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({message:query})
        });

        if(!response.ok){
            throw new Error(`Server responded with ${response.status}`);
        }

        const data=await response.json();

        renderResults(data);

        showToast(
            data.documents_found>0
                ?"Knowledge Retrieved Successfully"
                :"No matching article found"
        );

    }catch(err){

        console.error("Knowledge retrieval failed:",err);
        showToast("Couldn't reach the backend. Is it running?");

    }finally{

        button.disabled=false;
        button.innerHTML=originalLabel;
        lucide.createIcons();

    }

}
/* ==========================================
   RENDER RESULTS (from live API response)
========================================== */

function renderResults(data){

    const container=document.getElementById("knowledgeCardsContainer");
    container.innerHTML="";

    if(data.documents_found>0 && data.source){

        const card=document.createElement("div");
        card.className="knowledge-card";
        card.innerHTML=`
            <div class="card-header">
                <h3>📄 ${escapeHtml(data.source)}</h3>
                <span>${escapeHtml(data.confidence)} Match</span>
            </div>
            <p>${escapeHtml(data.answer)}</p>
        `;
        container.appendChild(card);

    }else{

        const empty=document.createElement("div");
        empty.className="knowledge-card";
        empty.innerHTML=`
            <div class="card-header">
                <h3>No articles found</h3>
            </div>
            <p>Try rephrasing your query — no matching knowledge base entry was found.</p>
        `;
        container.appendChild(empty);

    }

    document.getElementById("aiResponse").textContent=data.answer;

    document.getElementById("statDocuments").textContent=data.documents_found;
    document.getElementById("statConfidence").textContent=data.confidence;
    document.getElementById("statResponseTime").textContent=data.response_time;
    document.getElementById("statSource").textContent=data.source||"No match";

}
/* ==========================================
   UTILITIES
========================================== */

function escapeHtml(str){
    if(str===null||str===undefined) return "";
    const div=document.createElement("div");
    div.textContent=String(str);
    return div.innerHTML;
}

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

alert("No new notifications.");

});

}

function initializeProfile(){

const profile=document.querySelector(".profile");

if(!profile) return;

profile.addEventListener("click",()=>{

alert("Profile section coming soon.");

});

}
