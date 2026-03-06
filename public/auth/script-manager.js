// Fixed Script Manager - Properly blocks edit scripts for view-only users
// File: public/auth/script-manager.js
(function () {
  'use strict';

  class ScriptManager {
    constructor() {
      this.userRole = null;
      this.isViewOnly = false;
      this.editScripts = ['edit-manager.js', 'add-prefect-manager.js', 'event-manager.js'];
      this.blockedScripts = [];
      this.init();
    }

    init() {
      console.log('[SCRIPT-MANAGER] Initializing...');
      this.blockExistingScripts(); // Block scripts immediately
      this.interceptScriptLoading(); // Block future script loading
      this.waitForAuth();
    }

    blockExistingScripts() {
      // Find and disable existing edit scripts in the DOM
      console.log('[SCRIPT-MANAGER] Scanning for existing edit scripts...');

      this.editScripts.forEach(scriptName => {
        // Look for script tags with src containing the script name
        const scripts = document.querySelectorAll(`script[src*="${scriptName}"]`);

        scripts.forEach(script => {
          console.log(`[SCRIPT-MANAGER] Found edit script: ${script.src}`);

          // Store reference to blocked script
          this.blockedScripts.push({
            element: script,
            src: script.src,
            name: scriptName,
          });

          // Prevent the script from loading by changing its src
          script.src = 'data:text/javascript;base64,'; // Empty script
          script.setAttribute('data-blocked', 'true');
          script.setAttribute('data-original-src', script.src);

          console.log(`[SCRIPT-MANAGER] Blocked script: ${scriptName}`);
        });
      });
    }

    waitForAuth() {
      console.log('[SCRIPT-MANAGER] Waiting for auth system...');

      const checkAuth = () => {
        if (window.authSystem && window.authSystem.authCheckCompleted) {
          this.userRole = window.authSystem.userRole;
          this.isViewOnly = window.authSystem.isViewOnly;

          console.log(`[SCRIPT-MANAGER] Auth system check complete`);
          console.log(`[SCRIPT-MANAGER] User role: ${this.userRole}`);
          console.log(`[SCRIPT-MANAGER] Is view-only for this page: ${this.isViewOnly}`);

          if (this.isViewOnly) {
            this.enforceViewOnlyMode();
          } else {
            this.allowEditMode();
          }
        } else {
          setTimeout(checkAuth, 100);
        }
      };

      setTimeout(checkAuth, 500);
    }

    enforceViewOnlyMode() {
      console.log('[SCRIPT-MANAGER] Enforcing view-only mode...');

      // Remove blocked scripts completely
      this.blockedScripts.forEach(({ element, name }) => {
        if (element && element.parentNode) {
          element.remove();
          console.log(`[SCRIPT-MANAGER] Removed edit script: ${name}`);
        }
      });

      // Disable edit functions
      this.disableEditFunctions();

      // Show view-only notice
      setTimeout(() => {
        this.showViewOnlyNotice();
      }, 1000);
    }

    allowEditMode() {
      console.log('[SCRIPT-MANAGER] Allowing edit mode - restoring scripts...');

      // Restore blocked scripts for edit users
      this.blockedScripts.forEach(({ element, src, name }) => {
        if (element && element.hasAttribute('data-blocked')) {
          // Create new script element
          const newScript = document.createElement('script');
          newScript.src = src;
          newScript.async = false;

          // Insert after the blocked script
          element.parentNode.insertBefore(newScript, element.nextSibling);

          // Remove the blocked script
          element.remove();

          console.log(`[SCRIPT-MANAGER] Restored edit script: ${name}`);
        }
      });
    }

    interceptScriptLoading() {
      // Override script creation to block edit scripts
      const originalCreateElement = document.createElement;
      const self = this;

      document.createElement = function (tagName) {
        const element = originalCreateElement.call(document, tagName);

        if (tagName.toLowerCase() === 'script') {
          const originalSetAttribute = element.setAttribute;

          element.setAttribute = function (name, value) {
            if (name === 'src' && self.shouldBlockScript(value)) {
              console.log(`[SCRIPT-MANAGER] Intercepted and blocked: ${value}`);

              // Block the script by setting empty src
              return originalSetAttribute.call(this, 'src', 'data:text/javascript;base64,');
            }
            return originalSetAttribute.call(this, name, value);
          };
        }

        return element;
      };
    }

    shouldBlockScript(src) {
      // Ensure src is a string before processing
      if (!src || typeof src !== 'string') return false;

      // Always block edit scripts initially, then allow them based on user role
      const isEditScript = this.editScripts.some(script => src.includes(script));

      if (isEditScript) {
        console.log(`[SCRIPT-MANAGER] Checking if should block: ${src}`);

        // If we don't know the user role yet, block by default
        if (this.userRole === null) {
          return true;
        }

        // If user is view-only, block edit scripts
        return this.isViewOnly;
      }

      return false;
    }

    disableEditFunctions() {
      console.log('[SCRIPT-MANAGER] Disabling edit functions...');

      // List of global functions related to editing
      const editFunctions = [
        'openEditModal',
        'saveChanges',
        'deleteRecord',
        'addNewRecord',
        'editPrefect',
        'updatePrefect',
        'createPrefect',
        'deletePrefect',
        'addPrefect',
        'editEntry',
        'deleteEntry',
        'openAddModal',
        'openEditModal',
      ];

      // Disable functions immediately and check periodically for new ones
      const disableFunctions = () => {
        editFunctions.forEach(funcName => {
          if (window[funcName] && typeof window[funcName] === 'function') {
            // Store original function
            if (!window[`_original_${funcName}`]) {
              window[`_original_${funcName}`] = window[funcName];
            }

            // Replace with disabled version
            window[funcName] = () => {
              this.showEditDisabledMessage();
              return false;
            };

            console.log(`[SCRIPT-MANAGER] Disabled function: ${funcName}`);
          }
        });
      };

      // Disable immediately
      disableFunctions();

      // Check periodically for newly loaded functions
      setInterval(disableFunctions, 1000);
    }

    showEditDisabledMessage() {
      // Remove existing notification
      const existing = document.getElementById('edit-disabled-notification');
      if (existing) existing.remove();

      const notification = document.createElement('div');
      notification.id = 'edit-disabled-notification';
      notification.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 10000;
                background: #fff3cd; color: #856404; padding: 12px 20px;
                border-radius: 8px; font-family: Arial, sans-serif; font-size: 14px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #ffeaa7;
                transform: translateX(100%); transition: transform 0.3s ease;
            `;

      notification.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <span style="margin-right: 8px;">👁️</span>
                    <span><strong>View-Only Mode:</strong> Editing is disabled</span>
                </div>
            `;

      document.body.appendChild(notification);

      // Animate in
      setTimeout(() => {
        notification.style.transform = 'translateX(0)';
      }, 10);

      // Auto-remove after 3 seconds
      setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    }

    showViewOnlyNotice() {
      if (!this.isViewOnly) return;

      // Remove existing notice
      const existing = document.getElementById('view-only-notice');
      if (existing) existing.remove();

      const notice = document.createElement('div');
      notice.id = 'view-only-notice';
      notice.style.cssText = `
                position: fixed; top: 70px; left: 50%; transform: translateX(-50%);
                background: #d1ecf1; color: #0c5460; padding: 8px 16px;
                border-radius: 6px; font-family: Arial, sans-serif; font-size: 13px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #bee5eb;
                z-index: 1000; opacity: 0; transition: opacity 0.3s ease;
            `;

      notice.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <span style="margin-right: 6px;">ℹ️</span>
                    <span>You are in <strong>view-only mode</strong>. Contact an administrator to enable editing.</span>
                </div>
            `;

      document.body.appendChild(notice);

      // Fade in
      setTimeout(() => {
        notice.style.opacity = '1';
      }, 10);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        notice.style.opacity = '0';
        setTimeout(() => notice.remove(), 300);
      }, 5000);
    }

    // Method to conditionally load scripts based on permissions
    loadScriptIfAllowed(src, callback) {
      if (this.shouldBlockScript(src)) {
        console.log(`[SCRIPT-MANAGER] Script loading blocked: ${src}`);
        if (callback) callback(false);
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        console.log(`[SCRIPT-MANAGER] Script loaded successfully: ${src}`);
        callback && callback(true);
      };
      script.onerror = () => {
        console.error(`[SCRIPT-MANAGER] Script failed to load: ${src}`);
        callback && callback(false);
      };
      document.head.appendChild(script);
    }

    // Method to check if a script is blocked
    isScriptBlocked(scriptName) {
      return this.isViewOnly && this.editScripts.some(script => script.includes(scriptName));
    }
  }

  // Initialize script manager immediately (don't wait for DOM)
  console.log('[SCRIPT-MANAGER] Loading...');
  window.scriptManager = new ScriptManager();

  // Also initialize on DOM ready as backup
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (!window.scriptManager) {
        window.scriptManager = new ScriptManager();
      }
    });
  }

  // Export for use in other scripts
  window.ScriptManager = ScriptManager;
})();
