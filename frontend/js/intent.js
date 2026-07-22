/* ==========================================
   AI CUSTOMER SUPPORT ASSISTANT
   INTENT DETECTION
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    // Initialize Lucide Icons
    lucide.createIcons();

    // Load Sidebar
    loadSidebar();

    // Initialize Features
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
      INTENT DATABASE
========================================== */

const intents=[

{
keyword:["refund","return","money"],
intent:"Refund Request",
confidence:"98%",
sentiment:"Negative",
priority:"High",
recommendation:"Process refund immediately.",
action:"Create Refund Ticket"
},

{
keyword:["password","login","reset"],
intent:"Password Reset",
confidence:"97%",
sentiment:"Neutral",
priority:"Medium",
recommendation:"Send password reset link.",
action:"Reset User Password"
},

{
keyword:["delivery","shipping","track"],
intent:"Order Tracking",
confidence:"96%",
sentiment:"Neutral",
priority:"Low",
recommendation:"Share shipment status.",
action:"Track Order"
},

{
keyword:["payment","failed","transaction"],
intent:"Payment Issue",
confidence:"95%",
sentiment:"Negative",
priority:"High",
recommendation:"Verify payment gateway.",
action:"Create Billing Ticket"
}

];
/* ==========================================
      ANALYZE BUTTON
========================================== */

function initializeAnalyzer(){

const btn=document.getElementById("analyzeBtn");

if(!btn) return;

btn.addEventListener("click",analyzeMessage);

}
/* ==========================================
      ANALYZE MESSAGE
========================================== */

function analyzeMessage(){

const message=document
.getElementById("customerMessage")
.value
.toLowerCase();

let result=intents[0];

for(let item of intents){

if(item.keyword.some(word=>message.includes(word))){

result=item;

break;

}

}

updateResults(result);

}
/* ==========================================
      UPDATE UI
========================================== */

function updateResults(data){

document.getElementById("intentName").textContent=data.intent;

document.getElementById("confidence").textContent=data.confidence;

document.getElementById("sentiment").textContent=data.sentiment;

document.getElementById("priority").textContent=data.priority;

const cards=document.querySelectorAll(".recommend-card");

cards[0].querySelector("p").textContent=data.recommendation;

cards[1].querySelector("p").textContent=data.action;

showToast("Intent analyzed successfully!");

}
/* ==========================================
      TOAST MESSAGE
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
      THEME
========================================== */

function initializeTheme(){

const buttons=document.querySelectorAll(".icon-btn");

if(buttons.length<2) return;

buttons[1].addEventListener("click",()=>{

document.body.classList.toggle("dark");

});

}
/* ==========================================
      NOTIFICATION
========================================== */

function initializeNotifications(){

const buttons=document.querySelectorAll(".icon-btn");

if(buttons.length===0) return;

buttons[0].addEventListener("click",()=>{

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

alert("Profile settings coming soon.");

});

}