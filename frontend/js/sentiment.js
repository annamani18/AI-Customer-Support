/* ==========================================
   SENTIMENT ANALYSIS
========================================== */

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
   SENTIMENT DATABASE
========================================== */

const sentiments=[

{

keywords:["thank","great","awesome","excellent","love"],

sentiment:"Positive 😊",

confidence:"99%",

priority:"Low",

emotion:"Happy",

recommendation:"Customer is satisfied. Thank them and close the conversation.",

action:"Send Thank You Message"

},

{

keywords:["okay","fine","information","status"],

sentiment:"Neutral 😐",

confidence:"96%",

priority:"Medium",

emotion:"Calm",

recommendation:"Provide accurate information and continue assisting the customer.",

action:"Share Requested Information"

},

{

keywords:["refund","angry","disappointed","late","damaged","worst","terrible"],

sentiment:"Negative 😟",

confidence:"98%",

priority:"High",

emotion:"Frustrated",

recommendation:"Respond with empathy and prioritize the issue immediately.",

action:"Escalate to Senior Support"

}

];
/* ==========================================
   ANALYZE BUTTON
========================================== */

function initializeAnalyzer(){

    const button=document.getElementById("analyzeSentiment");

    if(!button) return;

    button.addEventListener("click",analyzeSentiment);

}
/* ==========================================
   ANALYZE SENTIMENT
========================================== */

function analyzeSentiment(){

    const message=document

    .getElementById("customerMessage")

    .value

    .toLowerCase();

    let result=sentiments[1];

    for(let item of sentiments){

        if(item.keywords.some(word=>message.includes(word))){

            result=item;

            break;

        }

    }

    updateResults(result);

}
/* ==========================================
   UPDATE RESULTS
========================================== */

function updateResults(data){

    document.getElementById("sentimentResult").textContent=data.sentiment;

    document.getElementById("confidenceResult").textContent=data.confidence;

    document.getElementById("priorityResult").textContent=data.priority;

    document.getElementById("emotionResult").textContent=data.emotion;

    document.getElementById("recommendationText").textContent=data.recommendation;

    document.getElementById("actionText").textContent=data.action;

    showToast("Sentiment analysis completed successfully!");

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

        alert("Profile page coming soon.");

    });

}