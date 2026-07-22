/* ==========================================
   REPORTS MODULE
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    initializeLucide();

    loadSidebar();

    initializeButtons();

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

    const sidebar=document.getElementById("sidebar-container");

    if(!sidebar) return;

    fetch("components/sidebar.html")

    .then(response=>response.text())

    .then(data=>{

        sidebar.innerHTML=data;

        initializeLucide();

    })

    .catch(error=>{

        console.error("Sidebar Error:",error);

    });

}
/* ==========================================
   REPORT BUTTONS
========================================== */

function initializeButtons(){

    const generate=document.getElementById("generateBtn");

    const pdf=document.getElementById("pdfBtn");

    const csv=document.getElementById("csvBtn");

    if(generate){

        generate.addEventListener("click",generateReport);

    }

    if(pdf){

        pdf.addEventListener("click",exportPDF);

    }

    if(csv){

        csv.addEventListener("click",exportCSV);

    }

}
/* ==========================================
   GENERATE REPORT
========================================== */

function generateReport(){

    const summary=document.getElementById("summaryText");

    if(summary){

        summary.textContent=

        "AI generated a fresh customer support report. Today 312 conversations were processed with 98.8% intent detection accuracy. Customer satisfaction remains high while response time continues below 18 seconds.";

    }

    showToast("Report generated successfully.");

}
/* ==========================================
   EXPORT FUNCTIONS
========================================== */

function exportPDF(){

    showToast("PDF exported successfully.");

}

function exportCSV(){

    showToast("CSV exported successfully.");

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
   NOTIFICATIONS
========================================== */

function initializeNotifications(){

    const buttons=document.querySelectorAll(".icon-btn");

    if(buttons.length===0) return;

    buttons[0].addEventListener("click",()=>{

        showToast("No new notifications.");

    });

}
/* ==========================================
   PROFILE
========================================== */

function initializeProfile(){

    const profile=document.querySelector(".profile");

    if(!profile) return;

    profile.addEventListener("click",()=>{

        showToast("Profile settings coming soon.");

    });

}
