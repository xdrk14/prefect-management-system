// Clean Security Protection
// File: public/auth/security-protection.js
(function() {

  'use strict';
  class SecurityProtection {
    constructor() {
      this.init();
    }

    init() {
      this.disableContextMenu();
      this.disableKeyboardShortcuts();
      this.preventTextSelection();
    }

    disableContextMenu() {
      window.addEventListener('contextmenu', e => {
        e.preventDefault();
      }, true);
    }

    disableKeyboardShortcuts() {
      window.addEventListener('keydown', e => {
        // Block common developer shortcuts
        if (
          e.keyCode === 123 || // F12
          (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || // Ctrl+Shift+I/J/C
          (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83)) // Ctrl+U or Ctrl+S
        ) {
          e.preventDefault();
          return false;
        }
      }, true);
    }

    preventTextSelection() {
      const style = document.createElement('style');
      style.textContent = `
                * {
                    -webkit-user-select: none !important;
                    -moz-user-select: none !important;
                    -ms-user-select: none !important;
                    user-select: none !important;
                }
                
                input, textarea, [contenteditable="true"] {
                    -webkit-user-select: text !important;
                    -moz-user-select: text !important;
                    -ms-user-select: text !important;
                    user-select: text !important;
                }
            `;
      document.head.appendChild(style);

      window.addEventListener('selectstart', e => {
        if (!e.target.matches('input, textarea, [contenteditable="true"]')) {
          e.preventDefault();
        }
      }, true);
    }
  }

  // Initialize security protection immediately
  new SecurityProtection();
})();
