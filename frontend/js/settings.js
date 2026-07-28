/* ==========================================
   SETTINGS MODULE
========================================== */

const API_BASE_URL = "https://ai-customer-support-backend-pard.onrender.com";

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

    if(!window.SupportAIAuth) return;

    window.SupportAIAuth.getCurrentUser().then(user => {

        if(!user){
            const nameEl = document.getElementById("profileName");
            if(nameEl) nameEl.textContent = "Couldn't load profile";
            console.error("Couldn't load the logged-in user — check that the backend is deployed with /auth/me and that you're logged in.");
            return;
        }

        applyUserToProfileCard(user);

    });

}

function applyUserToProfileCard(user){

    const emailEl = document.getElementById("profileEmail");
    if(emailEl) emailEl.textContent = user.email;

    const nameEl = document.getElementById("profileName");
    if(nameEl) nameEl.textContent = user.name;

    const roleEl = document.getElementById("profileRole");
    if(roleEl) roleEl.textContent = user.role;

    const avatarEl = document.getElementById("profileAvatar");
    if(avatarEl) avatarEl.textContent = user.initials;

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
   EDIT PROFILE (real, saves to the database)
========================================== */

function editProfile(){

    window.SupportAIAuth.getCurrentUser().then(user => {

        const currentName = user ? user.name : "";
        const currentRole = user ? user.role : "";

        const newName = prompt("Your name:", currentName || "");
        if(newName === null) return; // cancelled

        const newRole = prompt("Your role/title:", currentRole || "");
        if(newRole === null) return; // cancelled

        window.SupportAIAuth.authFetch(`${API_BASE_URL}/auth/me`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName.trim(), role: newRole.trim() })
        })
        .then(response => {
            if(!response.ok) throw new Error(`Server responded with ${response.status}`);
            return response.json();
        })
        .then(updatedUser => {
            applyUserToProfileCard(updatedUser);
            window.SupportAIAuth.refreshCurrentUser();
            showToast("Profile updated.");
        })
        .catch(error => {
            console.error("Profile update failed:", error);
            showToast("Couldn't save your profile — please try again.");
        });

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

            editProfile();

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