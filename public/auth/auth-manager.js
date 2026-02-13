// Fixed Auth Manager with debugging
// File: public/auth/auth-manager.js
(function () {
  'use strict';

  class AuthManager {
    constructor() {
      this.currentUser = null;
      this.userRole = null;
      this.currentPage = this.getCurrentPage();
      this.init();
    }

    init() {
      console.log('[AUTH-MANAGER] Initializing for page:', this.currentPage);
      this.waitForFirebase();
    }

    getCurrentPage() {
      const path = window.location.pathname;
      return path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    }

    waitForFirebase() {
      console.log('[AUTH-MANAGER] Waiting for Firebase...');

      window.addEventListener('firebaseReady', () => {
        console.log('[AUTH-MANAGER] Firebase ready event received');
        this.setupAuthListener();
      });

      if (window.firebaseAuth && window.firebaseDb) {
        console.log('[AUTH-MANAGER] Firebase already available');
        this.setupAuthListener();
      }
    }

    setupAuthListener() {
      console.log('[AUTH-MANAGER] Setting up auth listener');

      window.firebaseAuth.onAuthStateChanged(async user => {
        console.log('[AUTH-MANAGER] Auth state changed:', user ? user.email : 'No user');

        if (user) {
          const success = await this.loadUserData(user);
          if (success) {
            console.log('[AUTH-MANAGER] ✅ User data loaded successfully');
            // Don't redirect - let other systems handle page logic
          } else {
            console.log('[AUTH-MANAGER] ⚠️ Failed to load user data, but not redirecting');
          }
        } else {
          console.log('[AUTH-MANAGER] No user authenticated');
          this.clearUserData();
          // Only redirect if we're not on login page
          if (this.currentPage !== 'index.html') {
            console.log('[AUTH-MANAGER] Redirecting to login...');
            setTimeout(() => {
              window.location.href = 'index.html';
            }, 1000);
          }
        }
      });
    }

    async loadUserData(user) {
      try {
        console.log('[AUTH-MANAGER] Loading user data for:', user.email);

        const userDoc = await window.firebaseDb.collection('userRoles').doc(user.email).get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          console.log('[AUTH-MANAGER] User data found:', userData);

          this.currentUser = user;
          this.userRole = userData.role;

          // Cache user role for quick access
          this.cacheUserRole(user.email, userData.role);

          console.log('[AUTH-MANAGER] ✅ User role set to:', this.userRole);
          // Emit auth ready for other modules
          try {
            window.dispatchEvent(
              new CustomEvent('auth:ready', { detail: { userRole: this.userRole } })
            );
            console.log('[AUTH-MANAGER] Dispatched auth:ready event');
          } catch (e) {
            console.warn('[AUTH-MANAGER] Failed to dispatch auth:ready event', e);
          }
          return true;
        } else {
          console.log('[AUTH-MANAGER] ❌ User document not found in Firestore');

          // Try to create a default user document
          console.log('[AUTH-MANAGER] Attempting to create default user document...');
          try {
            await window.firebaseDb
              .collection('userRoles')
              .doc(user.email)
              .set({
                name: user.displayName || user.email.split('@')[0],
                role: 'FULL_ACCESS_EDIT', // Default to full access
                active: true,
                status: 'active',
                firebaseUid: user.uid,
                emailVerified: user.emailVerified,
                createdAt: new Date(),
                createdBy: 'auto-created',
              });

            console.log('[AUTH-MANAGER] ✅ Default user document created');
            // Retry loading user data
            return await this.loadUserData(user);
          } catch (createError) {
            console.error('[AUTH-MANAGER] Failed to create default user:', createError);
            return false;
          }
        }
      } catch (error) {
        console.error('[AUTH-MANAGER] Error loading user data:', error);
        console.error('[AUTH-MANAGER] Error code:', error.code);
        console.error('[AUTH-MANAGER] Error message:', error.message);
        return false;
      }
    }

    // Cache user role for instant access
    cacheUserRole(userEmail, userRole) {
      try {
        localStorage.setItem(`userRole_${userEmail}`, userRole);
        localStorage.setItem(`userRole_cached_${userEmail}`, Date.now().toString());
        console.log('[AUTH-MANAGER] [ROLE-CACHE] Cached role for instant access:', userRole);
      } catch (e) {
        console.log('[AUTH-MANAGER] [ROLE-CACHE] Failed to cache role:', e);
      }
    }

    // Clear cache when user logs out
    clearRoleCache(userEmail) {
      try {
        localStorage.removeItem(`userRole_${userEmail}`);
        localStorage.removeItem(`userRole_cached_${userEmail}`);
        console.log('[AUTH-MANAGER] [ROLE-CACHE] Cleared role cache');
      } catch (e) {
        console.log('[AUTH-MANAGER] [ROLE-CACHE] Failed to clear cache:', e);
      }
    }

    clearUserData() {
      console.log('[AUTH-MANAGER] Clearing user data');
      if (this.currentUser) {
        this.clearRoleCache(this.currentUser.email);
      }
      this.currentUser = null;
      this.userRole = null;
    }

    // User Management Functions
    async getAllUsers() {
      try {
        const snapshot = await window.firebaseDb.collection('userRoles').get();
        const users = [];
        snapshot.forEach(doc => {
          users.push({ id: doc.id, ...doc.data() });
        });
        return users;
      } catch (error) {
        console.error('[AUTH-MANAGER] Error getting users:', error);
        return [];
      }
    }

    async updateUserRole(email, newRole) {
      try {
        await window.firebaseDb.collection('userRoles').doc(email).update({
          role: newRole,
          updatedAt: new Date(),
          updatedBy: this.currentUser?.email,
        });
        return { success: true };
      } catch (error) {
        console.error('[AUTH-MANAGER] Error updating user role:', error);
        return { success: false, error: error.message };
      }
    }

    async toggleUserStatus(email) {
      try {
        const userDoc = await window.firebaseDb.collection('userRoles').doc(email).get();
        if (!userDoc.exists) throw new Error('User not found');

        const currentData = userDoc.data();
        const newStatus = !currentData.active;

        await window.firebaseDb.collection('userRoles').doc(email).update({
          active: newStatus,
          updatedAt: new Date(),
          updatedBy: this.currentUser?.email,
        });

        return { success: true, newStatus };
      } catch (error) {
        console.error('[AUTH-MANAGER] Error toggling user status:', error);
        return { success: false, error: error.message };
      }
    }

    // Utility Functions
    hasEditPermission() {
      return this.userRole === 'FULL_ACCESS_EDIT' || this.userRole === 'LIMITED_ACCESS_EDIT';
    }

    canAccessCentral() {
      return this.userRole === 'FULL_ACCESS_EDIT' || this.userRole === 'FULL_ACCESS_VIEW';
    }

    canManageAccounts() {
      return this.userRole === 'FULL_ACCESS_EDIT';
    }

    isAuthenticated() {
      const authenticated = !!(this.currentUser && this.userRole);
      console.log('[AUTH-MANAGER] isAuthenticated check:', authenticated, this.userRole);
      return authenticated;
    }

    async signOut() {
      try {
        console.log('[AUTH-MANAGER] Signing out...');
        await window.firebaseAuth.signOut();
        return { success: true };
      } catch (error) {
        console.error('[AUTH-MANAGER] Sign out error:', error);
        return { success: false, error: error.message };
      }
    }

    // Debug function to check current state
    getDebugInfo() {
      return {
        currentUser: this.currentUser?.email || 'None',
        userRole: this.userRole || 'None',
        currentPage: this.currentPage,
        isAuthenticated: this.isAuthenticated(),
        hasEditPermission: this.hasEditPermission(),
        canAccessCentral: this.canAccessCentral(),
        canManageAccounts: this.canManageAccounts(),
      };
    }

    // Initialize default users if needed
    async initializeDefaultUsers() {
      try {
        const existingUsers = await this.getAllUsers();
        if (existingUsers.length > 0) {
          return { success: true, message: 'Users already exist' };
        }

        const defaultUsers = [
          { email: 'admin1@prefect.com', role: 'FULL_ACCESS_EDIT', name: 'Admin User 1' },
          { email: 'viewer1@prefect.com', role: 'FULL_ACCESS_VIEW', name: 'Viewer User 1' },
          { email: 'editor1@prefect.com', role: 'LIMITED_ACCESS_EDIT', name: 'Editor User 1' },
          { email: 'user1@prefect.com', role: 'LIMITED_ACCESS_VIEW', name: 'User 1' },
        ];

        for (const user of defaultUsers) {
          await window.firebaseDb
            .collection('userRoles')
            .doc(user.email)
            .set({
              ...user,
              createdAt: new Date(),
              active: true,
            });
        }

        return { success: true, message: 'Default users created' };
      } catch (error) {
        console.error('[AUTH-MANAGER] Error initializing users:', error);
        return { success: false, error: error.message };
      }
    }
  }

  // Initialize when DOM loads
  window.addEventListener('DOMContentLoaded', () => {
    console.log('[AUTH-MANAGER] DOM loaded, creating AuthManager');
    window.authManager = new AuthManager();

    // Make debug function available globally
    window.authDebug = () => {
      console.log('=== AUTH MANAGER DEBUG ===');
      console.table(window.authManager.getDebugInfo());
    };

    console.log('[AUTH-MANAGER] 💡 Debug command: authDebug()');
  });
})();
