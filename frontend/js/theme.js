// frontend/js/theme.js - Minimal Additive Logic

const initThemeSystem = () => {
    // 1. Find your existing button by searching for common names
    // This looks for classes or IDs you likely already have
    const themeToggle = document.querySelector('.theme-toggle, .mode-switch, #theme-toggle, .dark-light-toggle, [onclick*="toggleTheme"]');

    if (!themeToggle) {
        console.warn("Theme toggle element not found. Please ensure your button has a class like 'theme-toggle'.");
        return;
    }

    // 2. Function to apply the theme
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        localStorage.setItem('selected-theme', theme);
    };

    // 3. Load saved preference
    const savedTheme = localStorage.getItem('selected-theme') || 'light';
    applyTheme(savedTheme);

    // 4. Attach event to your EXISTING button
    themeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        const isDark = document.body.classList.contains('dark-mode');
        applyTheme(isDark ? 'light' : 'dark');
    });
};

// Run without breaking other scripts
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeSystem);
} else {
    initThemeSystem();
}