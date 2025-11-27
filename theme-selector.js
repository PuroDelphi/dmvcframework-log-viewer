const ThemeManager = {
    init() {
        // Load saved theme or default to 'default'
        const savedTheme = localStorage.getItem('theme') || 'default';
        this.setTheme(savedTheme);
        this.updateActiveButton(savedTheme);
    },

    setTheme(themeName) {
        if (themeName === 'default') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', themeName);
        }
        localStorage.setItem('theme', themeName);
        this.updateActiveButton(themeName);
    },

    updateActiveButton(themeName) {
        document.querySelectorAll('.theme-option').forEach(btn => {
            if (btn.dataset.theme === themeName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
});
