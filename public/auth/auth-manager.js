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
        const email = user.email.toLowerCase();
        console.log('[AUTH-MANAGER] Fetching document for:', email);

        const userDoc = await window.firebaseDb.collection('userRoles').doc(email).get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          this.currentUser = user;

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
          // If the user is authenticated but has no Firestore doc, we provide a safe fallback
          // instead of failing. This prevents redirection loops.
          
          this.currentUser = user;
          
          // Whitelist for legacy admins (Hardcoded for emergency recovery)
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
      } else if (role === 'LIMITED_ACCESS_VIEW') {
        ['main', 'dashboard', 'aquila', 'cetus', 'cygnus', 'ursa', 'events'].forEach(k => perms[k] = 'view');
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
      this.currentUser = null;
      this.userRole = null;
      this.permissions = null;
      localStorage.removeItem(`userRole_${this.currentUser?.email}`);
      localStorage.removeItem(`userPerms_${this.currentUser?.email}`);
      localStorage.removeItem(`userAuth_ts_${this.currentUser?.email}`);
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
