// Advanced Auth System - Enforcement Layer
// File: public/auth/auth-system.js
(function () {
  'use strict';

  // 1. IMMEDIATE PROTECTION: Show premium loading overlay
  const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
  if (!isIndex) {
      const overlayHTML = `
        <div id="auth-loading-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background-color:#0d1b2a;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:opacity 0.5s ease-out;color:white;font-family:sans-serif;">
            <div style="width:50px;height:50px;border:3px solid rgba(255,255,255,0.1);border-top:3px solid #3b82f6;border-radius:50%;animation:auth-spin 1s linear infinite;margin-bottom:20px;"></div>
            <div style="font-size:14px;letter-spacing:0.1em;text-transform:uppercase;opacity:0.8;font-weight:600;">Securely Loading...</div>
            <style>
                @keyframes auth-spin { to { transform: rotate(360deg); } }
                body { overflow: hidden !important; }
            </style>
        </div>
      `;
      document.documentElement.insertAdjacentHTML('afterbegin', overlayHTML);
  }

  class AdvancedAuthSystem {
    constructor() {
      this.currentPage = this.getCurrentPage();
      this.init();
    }

    init() {
      console.log('[AUTH-SYSTEM] Monitoring:', this.currentPage);
      if (this.currentPage === 'index.html' || this.currentPage === '') return;
      this.waitForAuth();
    }

    getCurrentPage() {
      const path = window.location.pathname;
      return path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    }

    getPageKey(page) {
      const mapping = {
        'dashboard.html': 'dashboard',
        'central.html': 'central',
        'aquila.html': 'aquila',
        'cetus.html': 'cetus',
        'cygnus.html': 'cygnus',
        'ursa.html': 'ursa',
        'events.html': 'events',
        'accounts.html': 'accounts',
        'main.html': 'main'
      };
      return mapping[page] || page.split('.')[0];
    }

    waitForAuth() {
      // Listener for Auth Manager ready event
      window.addEventListener('auth:ready', (e) => {
        const { permissions } = e.detail;
        this.enforcePermissions(permissions);
      });

      // Backup check in case we missed the event
      const checkInterval = setInterval(() => {
          if (window.authManager && window.authManager.permissions) {
              clearInterval(checkInterval);
              this.enforcePermissions(window.authManager.permissions);
          }
      }, 100);

      // Safety timeout (8s) -> Redirect to login if auth hangs
      setTimeout(() => {
          const loading = document.getElementById('auth-loading-overlay');
          if (loading) {
             console.warn('[AUTH-SYSTEM] Auth timed out. Redirecting.');
             window.location.href = 'index.html';
          }
      }, 8000);
    }

    enforcePermissions(permissions) {
      if (!permissions) return;
      
      const pageKey = this.getPageKey(this.currentPage);
      const perm = permissions[pageKey] || 'none';

      // Prevent redundant enforcement if already done for this page/perm
      if (this.lastEnforcedPage === this.currentPage && this.lastEnforcedPerm === perm) {
        return;
      }

      console.log(`[AUTH-SYSTEM] Enforcing: ${pageKey} -> ${perm}`);
      this.lastEnforcedPage = this.currentPage;
      this.lastEnforcedPerm = perm;
      this.userRole = window.authManager?.userRole;
      this.isViewOnly = (perm === 'view');

      // 1. CHECK ACCESS
      // Always allow main.html
      const isAllowed = (pageKey === 'main') || (perm !== 'none');

      if (!isAllowed) {
        this.showAccessDeniedPopup();
        return;
      }

      // 2. REVEAL CONTENT
      this.revealContent();

      // Signal completion for ScriptManager
      this.authCheckCompleted = true;

      // 3. UI SYNC (Hide links)
      this.syncNavigation(permissions);

      // 4. VIEW ONLY MODE
      if (perm === 'view') {
        this.setupViewOnlyMode();
      }
    }

    showAccessDeniedPopup() {
        console.warn('[AUTH-SYSTEM] 🚫 Access Denied. Showing Popup.');
        
        // SECURITY: Clear the entire body content so restricted info is definitely gone.
        document.body.innerHTML = '';
        
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: '#111827', // Dark background
            zIndex: '2147483647', // Max z-index
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: 'white',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        });

        overlay.innerHTML = `
            <div style="background: #1f2937; padding: 2rem; border-radius: 1rem; text-align: center; border: 1px solid #374151; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
                <svg style="width: 4rem; height: 4rem; color: #ef4444; margin: 0 auto 1rem auto;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: white;">Access Denied</h2>
                <p style="color: #9ca3af; margin-bottom: 1rem;">You cannot access this page. Insufficient rights.</p>
                <div style="width: 100%; height: 4px; background: #374151; border-radius: 2px; overflow: hidden;">
                    <div id="redirect-progress" style="width: 100%; height: 100%; background: #ef4444; transition: width 3s linear;"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Remove loading overlay immediately to show access denied
        const loading = document.getElementById('auth-loading-overlay');
        if (loading) loading.remove();
        
        document.body.style.opacity = '1';
        document.body.style.pointerEvents = 'auto';

        // Animate bar
        setTimeout(() => {
            const bar = document.getElementById('redirect-progress');
            if (bar) bar.style.width = '0%';
        }, 100);

        // Redirect after 3 seconds
        setTimeout(() => {
            window.location.replace('main.html');
        }, 3000);
    }

    revealContent() {
        const loading = document.getElementById('auth-loading-overlay');
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => {
                loading.remove();
                document.body.style.overflow = ''; // Restore scrolling
            }, 500);
        }
    }

    syncNavigation(permissions) {
      const navLinks = document.querySelectorAll('.nav-link, a[href]');
      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#' || href.startsWith('javascript:')) return;
        
        const targetPage = href.split('/').pop();
        const targetKey = this.getPageKey(targetPage);
        const targetPerm = permissions[targetKey];

        if (targetPerm === 'none' && targetKey !== 'main' && targetKey !== 'index') {
          link.style.display = 'none';
        }
      });
    }

    setupViewOnlyMode() {
      console.log('[AUTH-SYSTEM] 👁️ Enabling View-Only Mode');
      const inputs = document.querySelectorAll('input, select, textarea, button[type="submit"]');
      inputs.forEach(el => {
        // Exempt search/filter/logout
        if (el.id === 'searchInput' || el.id === 'clearSearch' || el.closest('#auth-controls') || (el.onclick && el.onclick.toString().includes('logout'))) {
           return;
        }
        el.disabled = true;
        el.style.opacity = '0.7';
        el.title = 'You have view-only access to this page.';
      });

      // Special handling for tables (hiding "More" or "Action" buttons)
      const actionButtons = document.querySelectorAll(
         '.action-btn, .edit-btn, .delete-btn, button[onclick*="edit"], button[onclick*="delete"], .fa-edit, .fa-trash, .fa-ellipsis-v'
      );
      actionButtons.forEach(btn => {
         // Check if it's inside a navigation or harmless area
         if (btn.closest('nav') || btn.closest('#auth-controls')) return;
         btn.style.display = 'none';
      });
      
      // Also disable any elements with 'data-edit-only' attribute
      const editOnlyElements = document.querySelectorAll('[data-edit-only="true"]');
      editOnlyElements.forEach(el => el.style.display = 'none');
    }
  }

  // Initialize
  if (window.authSystem) {
    console.log('[AUTH-SYSTEM] Already initialized.');
    return;
  }
  window.authSystem = new AdvancedAuthSystem();
})();
