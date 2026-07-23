/* ==========================================
   SETTINGS MODULE
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    initializeLucide();

    loadSidebar();

    initializeTheme();

    initializeNotifications();

    initializeProfile();

    initializeButtons();

    showLoggedInUser();

});

/* ==========================================
   SHOW REAL LOGGED-IN USER
========================================== */

function showLoggedInUser(){

    const emailEl = document.getElementById("profileEmail");

    if(emailEl && window.SupportAIAuth){

        const email = window.SupportAIAuth.getUserEmail();

        if(email) emailEl.textContent = email;

    }

}
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
   BUTTONS
========================================== */

function initializeButtons(){

    const edit=document.getElementById("editProfile");

    const password=document.getElementById("changePassword");

    const logout=document.getElementById("logout");

    if(edit){

        edit.addEventListener("click",()=>{

            showToast("Profile editor coming soon.");

        });

    }

    if(password){

        password.addEventListener("click",()=>{

            showToast("Password change feature coming soon.");

        });

    }

    if(logout){

        logout.addEventListener("click",()=>{

            if(confirm("Are you sure you want to logout?")){

                window.SupportAIAuth.logout();

            }

        });

    }

}
/* ==========================================
   THEME
========================================== */

function initializeTheme(){

    const buttons=document.querySelectorAll(".icon-btn");

    if(buttons.length<2) return;

    buttons[1].addEventListener("click",()=>{

        document.body.classList.toggle("dark");

        showToast("Theme changed.");

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

        showToast("Administrator Profile");

    });

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