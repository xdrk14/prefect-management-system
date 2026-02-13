// Fixed Auth System - Working with your existing setup
// File: public/auth/auth-system.js
(function () {
  'use strict';

  class AdvancedAuthSystem {
    constructor() {
      this.currentUser = null;
      this.userRole = null;
      this.currentPage = this.getCurrentPage();
      this.isViewOnly = false;
      this.authCheckCompleted = false;
      this.init();
    }

    init() {
      console.log('[AUTH-SYSTEM] Initializing for page:', this.currentPage);
      this.waitForFirebase();
    }

    waitForFirebase() {
      console.log('[AUTH-SYSTEM] Waiting for Firebase...');

      let attempts = 0;
      const maxAttempts = 10;

      const checkFirebase = () => {
        attempts++;
        console.log(`[AUTH-SYSTEM] Firebase check attempt ${attempts}/${maxAttempts}`);

        if (window.firebaseAuth && window.firebaseDb) {
          console.log('[AUTH-SYSTEM] Firebase ready, setting up auth');
          this.setupAuth();
        } else if (attempts >= maxAttempts) {
          console.error('[AUTH-SYSTEM] Firebase failed to load');
          this.redirectToLogin();
        } else {
          setTimeout(checkFirebase, 500);
        }
      };

      checkFirebase();

      // Also listen for firebaseReady event
      window.addEventListener('firebaseReady', () => {
        if (!this.authCheckCompleted) {
          this.setupAuth();
        }
      });
    }

    setupAuth() {
      if (this.authCheckCompleted) {
        return;
      }

      console.log('[AUTH-SYSTEM] Setting up auth state listener');

      try {
        window.firebaseAuth.onAuthStateChanged(async user => {
          if (this.authCheckCompleted) {
            return;
          }

          console.log('[AUTH-SYSTEM] Auth state changed:', user ? user.email : 'No user');

          if (!user) {
            console.log('[AUTH-SYSTEM] No user, redirecting to login');
            this.authCheckCompleted = true;
            this.redirectToLogin();
            return;
          }

          const isValid = await this.validateUser(user);
          if (!isValid) {
            console.log('[AUTH-SYSTEM] User validation failed');
            this.authCheckCompleted = true;
            this.redirectToLogin();
            return;
          }

          if (!this.hasPageAccess()) {
            console.log('[AUTH-SYSTEM] Page access denied');
            this.authCheckCompleted = true;
            this.showAccessDenied();
            return;
          }

          console.log('[AUTH-SYSTEM] Access granted');
          this.authCheckCompleted = true;
          this.setupUserInterface();

          // Emit a global event so other parts of the UI (edit manager, table) can react
          try {
            window.dispatchEvent(
              new CustomEvent('auth:ready', { detail: { userRole: this.userRole } })
            );
            console.log('[AUTH-SYSTEM] Dispatched auth:ready event');
          } catch (e) {
            console.warn('[AUTH-SYSTEM] Failed to dispatch auth:ready event', e);
          }
        });
      } catch (error) {
        console.error('[AUTH-SYSTEM] Error setting up auth:', error);
        this.redirectToLogin();
      }
    }

    getCurrentPage() {
      const path = window.location.pathname;
      return path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    }

    async validateUser(user) {
      try {
        console.log('[AUTH-SYSTEM] Validating user:', user.email);

        const userDoc = await window.firebaseDb.collection('userRoles').doc(user.email).get();

        if (!userDoc.exists) {
          console.log('[AUTH-SYSTEM] User not found in database');

          // Try to list existing users for debugging
          try {
            const allUsers = await window.firebaseDb.collection('userRoles').limit(5).get();
            console.log(
              '[AUTH-SYSTEM] Existing users:',
              allUsers.docs.map(doc => doc.id)
            );

            // If no users exist, create a default one
            if (allUsers.docs.length === 0) {
              console.log('[AUTH-SYSTEM] No users found, creating default user');
              await this.createDefaultUser(user.email);
              return await this.validateUser(user);
            }
          } catch (listError) {
            console.error('[AUTH-SYSTEM] Could not list users:', listError);
          }

          return false;
        }

        const userData = userDoc.data();
        console.log('[AUTH-SYSTEM] User data:', userData);

        if (userData.active === false) {
          console.log('[AUTH-SYSTEM] User is inactive');
          return false;
        }

        this.currentUser = user;
        this.userRole = userData.role;
        this.isViewOnly = this.userRole && this.userRole.includes('VIEW');

        console.log('[AUTH-SYSTEM] User validated with role:', this.userRole);
        return true;
      } catch (error) {
        console.error('[AUTH-SYSTEM] Validation error:', error);
        return false;
      }
    }

    async createDefaultUser(email) {
      try {
        await window.firebaseDb.collection('userRoles').doc(email).set({
          role: 'FULL_ACCESS_EDIT',
          active: true,
          name: 'Auto-created User',
          createdAt: new Date(),
          createdBy: 'system',
        });
        console.log('[AUTH-SYSTEM] Default user created');
      } catch (error) {
        console.error('[AUTH-SYSTEM] Failed to create default user:', error);
      }
    }

    hasPageAccess() {
      console.log('[AUTH-SYSTEM] Checking page access for:', this.currentPage);

      const restrictedPages = {
        'accounts.html': ['FULL_ACCESS_EDIT'],
        'central.html': ['FULL_ACCESS_EDIT', 'FULL_ACCESS_VIEW'],
      };

      if (!restrictedPages[this.currentPage]) {
        console.log('[AUTH-SYSTEM] Page not restricted');
        return true;
      }

      const allowedRoles = restrictedPages[this.currentPage];
      const hasAccess = allowedRoles.includes(this.userRole);

      console.log('[AUTH-SYSTEM] Access check:', {
        page: this.currentPage,
        userRole: this.userRole,
        allowedRoles: allowedRoles,
        hasAccess: hasAccess,
      });

      return hasAccess;
    }

    setupUserInterface() {
      console.log('[AUTH-SYSTEM] Setting up UI');
      this.hideRestrictedLinks();

      if (this.isViewOnly) {
        this.setupViewOnlyMode();
      }

      this.blockRestrictedNavigation();
    }

    hideRestrictedLinks() {
      const restrictedPages = this.getRestrictedPages();

      restrictedPages.forEach(page => {
        const selectors = [
          `a[href="${page}"]`,
          `a[href="./${page}"]`,
          `.nav-link[data-page="${page}"]`,
        ];

        selectors.forEach(selector => {
          const links = document.querySelectorAll(selector);
          links.forEach(link => {
            link.style.opacity = '0.5';
            link.style.pointerEvents = 'none';
            link.title = 'Access restricted for your role';
            setTimeout(() => {
              link.style.display = 'none';
            }, 300);
          });
        });
      });
    }

    setupViewOnlyMode() {
      setTimeout(() => {
        const inputs = document.querySelectorAll('input, textarea, select, button[type="submit"]');
        inputs.forEach(input => {
          // Skip search/filter elements and auth controls
          if (
            !input.closest('#auth-controls') &&
            !input.onclick?.toString().includes('logout') &&
            input.id !== 'searchInput' &&
            input.id !== 'positionFilter' &&
            input.id !== 'pointsFilter' &&
            input.id !== 'clearSearch' &&
            !input.closest('.search-container')
          ) {
            input.disabled = true;
            input.style.opacity = '0.7';
            input.style.cursor = 'not-allowed';
            input.title = 'Read-only mode - editing disabled';
          }
        });
      }, 500);
    }

    blockRestrictedNavigation() {
      const restrictedPages = this.getRestrictedPages();

      document.addEventListener('click', e => {
        const link = e.target.closest('a');
        if (link) {
          const href = link.getAttribute('href');
          if (href && restrictedPages.some(page => href.includes(page))) {
            e.preventDefault();
            this.showAccessDeniedPopup();
          }
        }
      });
    }

    showAccessDeniedPopup() {
      const popup = document.createElement('div');
      popup.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.7); z-index: 999999;
                display: flex; align-items: center; justify-content: center;
            `;

      popup.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; max-width: 400px;">
                    <h2 style="color: #dc3545; margin-bottom: 15px;">Access Restricted</h2>
                    <p style="margin-bottom: 20px;">You don't have permission to access this section.</p>
                    <p style="font-size: 14px; color: #666; margin-bottom: 25px;">Role: ${this.getRoleDisplayName()}</p>
                    <button onclick="this.parentElement.parentElement.remove()" style="
                        background: #007bff; color: white; border: none; padding: 10px 20px;
                        border-radius: 5px; cursor: pointer;
                    ">OK</button>
                </div>
            `;

      document.body.appendChild(popup);
      setTimeout(() => popup.remove(), 5000);
    }

    getRestrictedPages() {
      const restrictions = {
        FULL_ACCESS_EDIT: [],
        FULL_ACCESS_VIEW: ['accounts.html'],
        LIMITED_ACCESS_EDIT: ['accounts.html', 'central.html'],
        LIMITED_ACCESS_VIEW: ['accounts.html', 'central.html'],
      };
      return restrictions[this.userRole] || [];
    }

    getRoleDisplayName() {
      const roleNames = {
        FULL_ACCESS_EDIT: 'Full Access & Edit',
        FULL_ACCESS_VIEW: 'Full Access (View Only)',
        LIMITED_ACCESS_EDIT: 'Limited Access & Edit',
        LIMITED_ACCESS_VIEW: 'Limited Access (View Only)',
      };
      return roleNames[this.userRole] || this.userRole;
    }

    showAccessDenied() {
      document.body.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100vh; 
                           background: linear-gradient(135deg, #0d1b2a 0%, #1c2541 50%, #0056b3 100%); 
                           font-family: Arial, sans-serif;">
                    <div style="text-align: center; padding: 40px; background: rgba(255,255,255,0.95); 
                               border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-width: 400px;">
                        <div style="font-size: 48px; margin-bottom: 20px;">🚫</div>
                        <h1 style="color: #333; margin-bottom: 15px;">Access Denied</h1>
                        <p style="color: #666; margin-bottom: 20px;">You don't have permission to view this page.</p>
                        <p style="color: #888; font-size: 14px; margin-bottom: 30px;">
                            Role: <strong>${this.getRoleDisplayName()}</strong><br>
                            Page: <strong>${this.currentPage}</strong>
                        </p>
                        <div>
                            <button onclick="window.location.href='dashboard.html'" style="
                                background: #007bff; color: white; border: none; padding: 12px 24px;
                                border-radius: 6px; cursor: pointer; margin: 5px; font-size: 14px;
                            ">Go to Dashboard</button>
                            <button onclick="this.handleLogout()" style="
                                background: #dc3545; color: white; border: none; padding: 12px 24px;
                                border-radius: 6px; cursor: pointer; margin: 5px; font-size: 14px;
                            ">Logout</button>
                        </div>
                    </div>
                </div>
                <script>
                    function handleLogout() {
                        if (window.firebaseAuth) {
                            window.firebaseAuth.signOut().then(() => {
                                window.location.href = 'index.html';
                            });
                        } else {
                            window.location.href = 'index.html';
                        }
                    }
                </script>
            `;
    }

    redirectToLogin() {
      console.log('[AUTH-SYSTEM] Redirecting to login');
      if (window.firebaseAuth && window.firebaseAuth.currentUser) {
        window.firebaseAuth.signOut().catch(() => {});
      }
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 100);
    }
  }

  // Initialize the auth system
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  if (currentPage === 'index.html') {
    console.log('[AUTH-SYSTEM] On login page, skipping auth');
  } else {
    console.log('[AUTH-SYSTEM] Initializing auth for:', currentPage);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.authSystem = new AdvancedAuthSystem();
      });
    } else {
      window.authSystem = new AdvancedAuthSystem();
    }
  }
})();
