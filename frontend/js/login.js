/* ==========================================
   LOGIN / SIGNUP
========================================== */

const API_BASE_URL = "https://ai-customer-support-backend-pard.onrender.com";

document.addEventListener("DOMContentLoaded", () => {

    lucide.createIcons();

    initializeTabs();
    initializeLoginForm();
    initializeSignupForm();

});

/* ==========================================
   TABS
========================================== */

function initializeTabs(){

    const tabLogin = document.getElementById("tabLogin");
    const tabSignup = document.getElementById("tabSignup");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    tabLogin.addEventListener("click", () => {
        tabLogin.classList.add("active");
        tabSignup.classList.remove("active");
        loginForm.classList.add("active");
        signupForm.classList.remove("active");
        hideError();
    });

    tabSignup.addEventListener("click", () => {
        tabSignup.classList.add("active");
        tabLogin.classList.remove("active");
        signupForm.classList.add("active");
        loginForm.classList.remove("active");
        hideError();
    });

}

/* ==========================================
   LOGIN
========================================== */

function initializeLoginForm(){

    const form = document.getElementById("loginForm");

    form.addEventListener("submit", (e) => {

        e.preventDefault();
        hideError();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;
        const submitBtn = document.getElementById("loginSubmit");

        setLoading(submitBtn, true, "Log In");

        fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        })
        .then(async response => {
            const data = await response.json();
            if(!response.ok) throw new Error(data.detail || "Login failed.");
            return data;
        })
        .then(data => {
            window.SupportAIAuth.setSession(data.access_token, data.email);
            window.location.href = "dashboard.html";
        })
        .catch(error => {
            showError(error.message || "Couldn't reach the backend. Is it running?");
        })
        .finally(() => {
            setLoading(submitBtn, false, "Log In");
        });

    });

}

/* ==========================================
   SIGNUP
========================================== */

function initializeSignupForm(){

    const form = document.getElementById("signupForm");

    form.addEventListener("submit", (e) => {

        e.preventDefault();
        hideError();

        const email = document.getElementById("signupEmail").value.trim();
        const password = document.getElementById("signupPassword").value;
        const submitBtn = document.getElementById("signupSubmit");

        if(password.length < 8){
            showError("Password must be at least 8 characters.");
            return;
        }

        setLoading(submitBtn, true, "Create Account");

        fetch(`${API_BASE_URL}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        })
        .then(async response => {
            const data = await response.json();
            if(!response.ok) throw new Error(data.detail || "Signup failed.");
            return data;
        })
        .then(data => {
            window.SupportAIAuth.setSession(data.access_token, data.email);
            window.location.href = "dashboard.html";
        })
        .catch(error => {
            showError(error.message || "Couldn't reach the backend. Is it running?");
        })
        .finally(() => {
            setLoading(submitBtn, false, "Create Account");
        });

    });

}

/* ==========================================
   HELPERS
========================================== */

function showError(message){
    const el = document.getElementById("errorMsg");
    el.textContent = message;
    el.classList.add("show");
}

function hideError(){
    const el = document.getElementById("errorMsg");
    el.classList.remove("show");
    el.textContent = "";
}

function setLoading(button, isLoading, label){
    button.disabled = isLoading;
    button.innerHTML = isLoading
        ? `<i data-lucide="loader"></i> Please wait...`
        : `<i data-lucide="${label === "Log In" ? "log-in" : "user-plus"}"></i> ${label}`;
    lucide.createIcons();
}
