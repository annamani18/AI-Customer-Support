/* ==========================================
   KNOWLEDGE RETRIEVAL
========================================== */

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
   KNOWLEDGE BASE
========================================== */

const knowledgeBase=[

{

keyword:["refund","return","damaged"],

response:"Your product is eligible for return within 30 days. Please upload product images and your order ID.",

documents:3,

confidence:"98%",

time:"0.31s"

},

{

keyword:["password","login"],

response:"You can reset your password using the Forgot Password option on the login page.",

documents:2,

confidence:"97%",

time:"0.27s"

},

{

keyword:["shipping","delivery","track"],

response:"You can track your order using the tracking number sent to your email.",

documents:4,

confidence:"96%",

time:"0.29s"

},

{

keyword:["payment","failed"],

response:"Your payment failed. Please verify your card details or try another payment method.",

documents:3,

confidence:"95%",

time:"0.34s"

}

];
/* ==========================================
   BUTTON
========================================== */

function initializeRetrieval(){

const button=document.getElementById("retrieveBtn");

if(!button) return;

button.addEventListener("click",retrieveKnowledge);

}
/* ==========================================
   RETRIEVE
========================================== */

function retrieveKnowledge(){

const query=document

.getElementById("customerQuery")

.value

.toLowerCase();

let result=knowledgeBase[0];

for(let item of knowledgeBase){

if(item.keyword.some(word=>query.includes(word))){

result=item;

break;

}

}

updateResponse(result);

}
/* ==========================================
   UPDATE UI
========================================== */

function updateResponse(data){

document.getElementById("aiResponse").textContent=data.response;

const cards=document.querySelectorAll(".stat-card h2");

cards[0].textContent=data.documents;

cards[1].textContent=data.confidence;

cards[2].textContent=data.time;

cards[3].textContent="Internal KB";

showToast("Knowledge Retrieved Successfully");

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

alert("Profile section coming soon.");

});

}
