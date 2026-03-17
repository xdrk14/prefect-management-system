// Comprehensive Auth Manager - Granular Permission System
// File: public/auth/auth-manager.js
(function () {
  'use strict';

  class AuthManager {
    constructor() {
      this.currentUser = null;
      this.userRole = null;
      this.permissions = null;
      this.currentPage = this.getCurrentPage();
      this.init();
    }

    init() {
      console.log('[AUTH-MANAGER] Initializing...');
      this.setupAuthListener();
    }

    getCurrentPage() {
      const path = window.location.pathname;
      return path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    }

    setupAuthListener() {
      if (!window.firebaseAuth) {
        console.warn('[AUTH-MANAGER] Firebase Auth not available, waiting...');
        setTimeout(() => this.setupAuthListener(), 500);
        return;
      }

      window.firebaseAuth.onAuthStateChanged(async user => {
        if (user) {
          console.log('[AUTH-MANAGER] User detected:', user.email);
          const success = await this.loadUserData(user);
          if (!success && this.currentPage !== 'index.html') {
             console.error('[AUTH-MANAGER] Failed to load user data');
          }
        } else {
          console.log('[AUTH-MANAGER] No authenticated session');
          this.clearUserData();
          if (this.currentPage !== 'index.html') {
            this.redirectToLogin();
          }
        }
      });
    }

    async loadUserData(user) {
      try {
        const email = user.email.trim().toLowerCase();
        console.log('[AUTH-MANAGER] Fetching document for:', email);

        // [RACE CONDITION FIX] Wait for DB to be available
        const waitForDb = (timeout = 5000) => {
          const start = Date.now();
          return new Promise((resolve, reject) => {
            const check = () => {
              if (window.firebaseDb) resolve(window.firebaseDb);
              else if (Date.now() - start > timeout) reject(new Error('Firebase DB timeout'));
              else setTimeout(check, 100);
            };
            check();
          });
        };

        const db = await waitForDb();
        
        // [STABILITY FIX] Retry logic for Firestore
        let userDoc = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          try {
            userDoc = await db.collection('userRoles').doc(email).get();
            break;
          } catch (e) {
            attempts++;
            console.warn(`[AUTH-MANAGER] Fetch attempt ${attempts} failed:`, e.message);
            if (attempts >= maxAttempts) throw e;
            await new Promise(r => setTimeout(r, 500));
          }
        }

        if (userDoc && userDoc.exists) {
          const userData = userDoc.data();

          // [MASTER OVERRIDE] prioritized over Firestore permissions
          const masterAdmins = ['hasthij29@gmail.com'];
          if (masterAdmins.includes(email)) {
            console.log('[AUTH-MANAGER] 👑 Master Admin detected. Bypassing document restrictions.');
            this.userRole = 'FULL_ACCESS_EDIT';
            this.permissions = this.migrateLegacyRole('FULL_ACCESS_EDIT');
          } else {
            this.userRole = userData.role;
            // Initialize permissions with legacy defaults and merge with Firestore
            const defaultPerms = this.migrateLegacyRole(userData.role);
            this.permissions = { ...defaultPerms, ...(userData.permissions || {}) };
          }
           
          // Safety: Main is always viewable
          this.permissions.main = 'view';

          // ✅ Set currentUser AFTER permissions are built, so polling checks don't resolve early
          this.currentUser = user;

          // Cache for performance
          this.cacheAuthData(email, this.userRole, this.permissions);

          console.log('[AUTH-MANAGER] ✅ Account loaded. Role:', this.userRole);
          console.log('[AUTH-MANAGER] 🔑 Permissions:', this.permissions);
          
          window.dispatchEvent(
            new CustomEvent('auth:ready', { 
              detail: { userRole: this.userRole, permissions: this.permissions } 
            })
          );
          return true;
        } else {
          console.warn('[AUTH-MANAGER] ❌ Firestore document missing for:', email);
          
          // [FALLBACK] Legacy Account Support
          const legacyAdmins = ['hasthij29@gmail.com']; 
          
          if (legacyAdmins.includes(email)) {
             console.log('[AUTH-MANAGER] 🛠️ Legacy Admin detected. Granting FULL_ACCESS_EDIT.');
             this.userRole = 'FULL_ACCESS_EDIT';
          } else {
             console.log('[AUTH-MANAGER] 👥 Legacy User detected. Granting LIMITED_ACCESS_VIEW.');
             this.userRole = 'LIMITED_ACCESS_VIEW';
          }

          this.permissions = this.migrateLegacyRole(this.userRole);
          this.permissions.main = 'view'; // Always allow home page

          // ✅ Set currentUser AFTER permissions are built
          this.currentUser = user;

          this.cacheAuthData(email, this.userRole, this.permissions);
          
          window.dispatchEvent(
            new CustomEvent('auth:ready', { 
              detail: { userRole: this.userRole, permissions: this.permissions } 
            })
          );
          return true;
        }
      } catch (error) {
        console.error('[AUTH-MANAGER] Error loading user data:', error);
        return false;
      }
    }

    migrateLegacyRole(role) {
      const perms = {
        main: 'view', dashboard: 'none', central: 'none', aquila: 'none', 
        cetus: 'none', cygnus: 'none', ursa: 'none', events: 'none', accounts: 'none'
      };

      if (role === 'FULL_ACCESS_EDIT') {
        Object.keys(perms).forEach(k => perms[k] = 'edit');
      } else if (role === 'FULL_ACCESS_VIEW') {
        Object.keys(perms).forEach(k => perms[k] = 'view');
      } else if (role === 'LIMITED_ACCESS_EDIT') {
        ['main', 'dashboard', 'aquila', 'cetus', 'cygnus', 'ursa', 'events'].forEach(k => perms[k] = 'edit');
        perms.accounts = 'none'; // Explicitly none for limited
        perms.central = 'none';
      } else if (role === 'LIMITED_ACCESS_VIEW') {
        ['main', 'dashboard', 'aquila', 'cetus', 'cygnus', 'ursa', 'events'].forEach(k => perms[k] = 'view');
        perms.accounts = 'none';
        perms.central = 'none';
      }

      return perms;
    }

    hasPermission(page, level = 'view') {
      if (!this.permissions) return false;
      const perm = this.permissions[page];
      if (!perm) return false;
      
      if (level === 'edit') return perm === 'edit';
      if (level === 'view') return perm === 'view' || perm === 'edit';
      return false;
    }

    cacheAuthData(email, role, permissions) {
      try {
        const key = email.toLowerCase();
        localStorage.setItem(`userRole_${key}`, role);
        localStorage.setItem(`userPerms_${key}`, JSON.stringify(permissions));
        localStorage.setItem(`userAuth_ts_${key}`, Date.now().toString());
      } catch (e) {
        console.warn('[AUTH-MANAGER] Caching failed:', e);
      }
    }

    clearUserData() {
      const emailKey = this.currentUser?.email
        ? this.currentUser.email.toLowerCase()
        : null;

      this.currentUser = null;
      this.userRole = null;
      this.permissions = null;

      if (emailKey) {
        localStorage.removeItem(`userRole_${emailKey}`);
        localStorage.removeItem(`userPerms_${emailKey}`);
        localStorage.removeItem(`userAuth_ts_${emailKey}`);
      }
    }

    redirectToLogin() {
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 500);
    }
  }

  if (window.authManager) {
    console.log('[AUTH-MANAGER] Already initialized.');
    return;
  }
  window.authManager = new AuthManager();
})();
