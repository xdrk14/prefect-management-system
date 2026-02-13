// Clean Security Protection
// File: public/auth/security-protection.js
(function () {
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
      document.addEventListener('contextmenu', e => {
        e.preventDefault();
        return false;
      });
    }

    disableKeyboardShortcuts() {
      document.addEventListener('keydown', e => {
        // Block common developer shortcuts
        if (
          e.keyCode === 123 || // F12
          (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
          (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
          (e.ctrlKey && e.shiftKey && e.keyCode === 67) || // Ctrl+Shift+C
          (e.ctrlKey && e.keyCode === 85)
        ) {
          // Ctrl+U

          e.preventDefault();
          return false;
        }
      });
    }

    preventTextSelection() {
      const style = document.createElement('style');
      style.textContent = `
                * {
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                }
                
                input, textarea {
                    -webkit-user-select: text !important;
                    -moz-user-select: text !important;
                    -ms-user-select: text !important;
                    user-select: text !important;
                }
            `;
      document.head.appendChild(style);

      document.addEventListener('selectstart', e => {
        if (!e.target.matches('input, textarea')) {
          e.preventDefault();
          return false;
        }
      });
    }
  }

  // Initialize security protection immediately
  new SecurityProtection();
})();
