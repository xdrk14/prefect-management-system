// Account Management System - Firebase Integration - Clean Version
// File: public/scripts/accounts-manager.js
(function () {
  'use strict';

  class AccountsManager {
    constructor() {
      this.currentUsers = [];
      this.isLoading = false;
      this.currentUserData = null;
      this.init();
    }

    init() {
      console.log('[ACCOUNTS-MANAGER] Initializing...');
      this.waitForFirebase();
      this.setupAuthenticationCheck();
    }

    waitForFirebase() {
      if (window.firebaseAuth && window.firebaseDb) {
        this.setupFirebase();
      } else {
        setTimeout(() => this.waitForFirebase(), 100);
      }
    }

    setupFirebase() {
      console.log('[ACCOUNTS-MANAGER] Firebase ready');

      // Get current user data
      window.firebaseAuth.onAuthStateChanged(user => {
        if (user) {
          this.loadCurrentUserData(user);
        }
      });

      // Setup real-time listener for user accounts
      this.setupRealtimeListener();
    }

    async loadCurrentUserData(user) {
      try {
        const userDoc = await window.firebaseDb.collection('userRoles').doc(user.email).get();
        if (userDoc.exists) {
          this.currentUserData = {
            email: user.email,
            ...userDoc.data(),
          };
          console.log('[ACCOUNTS-MANAGER] Current user:', this.currentUserData);
        }
      } catch (error) {
        console.error('[ACCOUNTS-MANAGER] Error loading user data:', error);
      }
    }

    setupRealtimeListener() {
      if (this.unsubscribeUsers) this.unsubscribeUsers();
      this.unsubscribeUsers = window.firebaseDb.collection('userRoles').onSnapshot(
        snapshot => {
          console.log('[ACCOUNTS-MANAGER] Real-time update received');
          this.handleRealtimeUpdate(snapshot);
        },
        error => {
          console.error('[ACCOUNTS-MANAGER] Real-time listener error:', error);
          this.showToast('Connection lost. Retrying...', 'warning');
        }
      );
    }

    handleRealtimeUpdate(snapshot) {
      this.currentUsers = [];
      snapshot.forEach(doc => {
        const userData = doc.data();
        this.currentUsers.push({
          id: doc.id,
          email: doc.id,
          ...userData,
        });
      });

      // Update UI if accountsUI exists
      if (window.accountsUI) {
        window.accountsUI.updateUserTable(this.currentUsers);
        window.accountsUI.updateStats(this.currentUsers);
      }

      // Also update any legacy global functions if they exist
      if (typeof window.updateUserTable === 'function') {
        window.updateUserTable(this.currentUsers);
      }
      if (typeof window.updateStats === 'function') {
        window.updateStats(this.currentUsers);
      }
    }

    setupAuthenticationCheck() {
      // Check if user is authenticated and has proper permissions
      let authCheckAttempts = 0;
      const maxAuthChecks = 30;

      const checkAuth = () => {
        authCheckAttempts++;

        if (window.firebaseAuth && window.firebaseAuth.currentUser) {
          console.log('[ACCOUNTS-MANAGER] User authenticated, setting up system...');
          return;
        }

        if (authCheckAttempts >= maxAuthChecks) {
          console.log('[ACCOUNTS-MANAGER] Authentication timeout, redirecting...');
          window.location.href = 'index.html';
          return;
        }

        setTimeout(checkAuth, 500);
      };

      setTimeout(checkAuth, 1000); // Wait 1 second before starting checks
    }

    // Check if Firebase is ready
    isFirebaseReady() {
      return !!(window.firebaseAuth && window.firebaseDb && this.currentUserData);
    }

    // Test Firebase connection with full diagnostic
    async testFirebaseConnection() {
      console.log('🧪 Testing Firebase Connection...');
      console.log('Firebase Auth:', !!window.firebaseAuth);
      console.log('Firebase DB:', !!window.firebaseDb);
      console.log('Current User:', this.currentUserData?.email || 'None');
      console.log('Users Loaded:', this.currentUsers.length);
      console.log('Manager Ready:', this.isFirebaseReady());

      // Run full diagnostic
      const result = await this.diagnoseFirebaseAuth();

      if (result) {
        this.showToast('[FIRE] Firebase connection test passed!', 'success');
      } else {
        this.showToast('[WARNING] Firebase connection issues detected', 'warning');
        this.checkFirebaseConsoleSettings();
      }

      return result;
    }

    // Create new user account with Firebase Auth + Firestore
    // FIXED: Create user method that doesn't auto sign-in
    // Replace the createUser method in your accounts-manager.js

    async createUser(userData) {
      if (this.isLoading) return { success: false, error: 'Operation in progress' };

      this.isLoading = true;
      this.showToast('Creating user account...', 'info');

      // Store the current admin user before creating new user
      const currentAdmin = window.firebaseAuth.currentUser;
      const currentAdminEmail = currentAdmin?.email;

      try {
        const email = userData.email.toLowerCase();
        const { password, name, role, status, permissions } = userData;

        // Validate input
        if (!this.validateUserData(userData)) {
          throw new Error('Invalid user data provided');
        }

        // Validate password for new users
        if (!password || password.trim().length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        // Check if user already exists in Firestore
        const existingUser = await window.firebaseDb.collection('userRoles').doc(email).get();
        if (existingUser.exists) {
          throw new Error('User with this email already exists');
        }

        console.log('[ACCOUNTS-MANAGER] Creating user in Firebase Auth...');

        // SOLUTION 1: Create a secondary Firebase app instance for user creation
        // This prevents the new user from becoming the current user
        let firebaseUser = null;
        let secondaryApp = null;

        try {
          // Create a secondary Firebase app instance
          const config = window.firebase.app().options;
          secondaryApp = window.firebase.initializeApp(config, `temp-${Date.now()}`);
          const secondaryAuth = secondaryApp.auth();

          // Create user with secondary app (won't affect current auth state)
          const userCredential = await secondaryAuth.createUserWithEmailAndPassword(
            email,
            password
          );
          firebaseUser = userCredential.user;

          console.log('[ACCOUNTS-MANAGER] [SUCCESS] Firebase Auth user created:', firebaseUser.uid);

          // Immediately sign out from secondary app to clean up
          await secondaryAuth.signOut();
        } catch (authError) {
          console.error('[ACCOUNTS-MANAGER] Firebase Auth creation failed:', authError);

          // Handle specific auth errors
          if (authError.code === 'auth/email-already-in-use') {
            throw new Error('This email is already registered in Firebase Auth');
          } else if (authError.code === 'auth/weak-password') {
            throw new Error('Password is too weak. Please use a stronger password.');
          } else if (authError.code === 'auth/invalid-email') {
            throw new Error('Invalid email format');
          } else {
            throw new Error(`Auth creation failed: ${authError.message}`);
          }
        } finally {
          // Clean up secondary app
          if (secondaryApp) {
            try {
              await secondaryApp.delete();
            } catch (e) {
              console.warn('Failed to delete secondary app:', e);
            }
          }
        }

        console.log('[ACCOUNTS-MANAGER] Creating user profile in Firestore...');

        // STEP 2: Create Firestore user profile (using main app, admin still signed in)
        const userRoleData = {
          name: name,
          // If granular permissions are used, set role to LIMITED_ACCESS_EDIT to prevent full access confusion
          role: permissions ? 'LIMITED_ACCESS_EDIT' : role,
          permissions: permissions || this.migrateLegacyRole(role),
          active: status === 'active',
          status: status,
          firebaseUid: firebaseUser.uid,
          emailVerified: firebaseUser.emailVerified,
          createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: this.currentUserData?.email || 'system',
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: this.currentUserData?.email || 'system',
        };

        try {
          // This uses the main app where admin is still signed in
          await window.firebaseDb.collection('userRoles').doc(email).set(userRoleData);
          console.log('[ACCOUNTS-MANAGER] [SUCCESS] Firestore profile created');
        } catch (firestoreError) {
          console.error('[ACCOUNTS-MANAGER] Firestore creation failed:', firestoreError);

          // If Firestore fails, try to clean up the Firebase Auth user
          try {
            console.log(
              '[ACCOUNTS-MANAGER] Cleaning up Firebase Auth user due to Firestore failure...'
            );
            // We can't delete the user directly since we're not signed in as them
            // This would need to be handled server-side or by temporarily signing in
            console.warn('[ACCOUNTS-MANAGER] Cannot clean up Firebase Auth user from client-side');
          } catch (cleanupError) {
            console.error('[ACCOUNTS-MANAGER] Failed to cleanup Firebase Auth user:', cleanupError);
          }

          throw new Error(`Profile creation failed: ${firestoreError.message}`);
        }

        // Verify admin is still signed in
        if (window.firebaseAuth.currentUser?.email !== currentAdminEmail) {
          console.warn('[ACCOUNTS-MANAGER] Admin context was lost, but user creation succeeded');
          this.showToast('⚠️ User created but you may need to refresh the page', 'warning');
        }

        // STEP 3: Log the action
        await this.logAuditAction(
          'CREATE',
          email,
          null,
          userRoleData,
          `Created complete user account (Auth + Profile)`
        );

        this.showToast(`[SUCCESS] User account created successfully! User can now login.`, 'success');
        return {
          success: true,
          userData: userRoleData,
          firebaseUid: firebaseUser.uid,
          authUserCreated: true,
        };
      } catch (error) {
        console.error('[ACCOUNTS-MANAGER] Create user error:', error);
        this.showToast(`❌ Failed to create user: ${error.message}`, 'error');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    }

    // ALTERNATIVE SOLUTION: Server-side user creation
    // If the above doesn't work, you can also use this approach:

    async createUserServerSide(userData) {
      // This would require a cloud function or server endpoint
      // that uses Firebase Admin SDK to create users without affecting client auth state

      try {
        const response = await fetch('/api/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await window.firebaseAuth.currentUser.getIdToken()}`,
          },
          body: JSON.stringify(userData),
        });

        const result = await response.json();

        if (result.success) {
          // Create Firestore profile on client side
          const userRoleData = {
            name: userData.name,
            role: userData.role,
            active: userData.status === 'active',
            status: userData.status,
            firebaseUid: result.uid,
            emailVerified: false,
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: this.currentUserData?.email || 'system',
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: this.currentUserData?.email || 'system',
          };

          await window.firebaseDb.collection('userRoles').doc(userData.email).set(userRoleData);

          this.showToast('✅ User created successfully!', 'success');
          return { success: true, userData: userRoleData, firebaseUid: result.uid };
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Server-side user creation failed:', error);
        this.showToast(`❌ Failed to create user: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    // Update existing user
    async updateUser(email, updates) {
      const normalizedEmail = email.toLowerCase();
      if (this.isLoading) return { success: false, error: 'Operation in progress' };

      this.isLoading = true;
      this.showToast('Updating user account...', 'info');

      try {
        // Get current user data
        const userDoc = await window.firebaseDb.collection('userRoles').doc(normalizedEmail).get();
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const currentData = userDoc.data();
        const updateData = {
          ...updates,
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: this.currentUserData?.email || 'system',
        };

        // If role is updated but permissions aren't explicitly provided, migrate them
        if (updates.role && !updates.permissions) {
            updateData.permissions = this.migrateLegacyRole(updates.role);
        }
        // [FIX] Do NOT forcefully overwrite role if permissions are present. 
        // We trust the 'role' field passed in 'updates' (which comes from the UI selection).

        // Update in Firebase
        await window.firebaseDb.collection('userRoles').doc(normalizedEmail).update(updateData);

        // Log the action
        await this.logAuditAction(
          'UPDATE',
          normalizedEmail,
          currentData,
          { ...currentData, ...updateData },
          `Updated user account: ${Object.keys(updates).join(', ')}`
        );

        this.showToast(`User account updated successfully!`, 'success');
        return { success: true };
      } catch (error) {
        console.error('[ACCOUNTS-MANAGER] Update user error:', error);
        this.showToast(`Failed to update user: ${error.message}`, 'error');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    }

    // Delete user (soft delete - deactivate)
    async deleteUser(email) {
      const normalizedEmail = email.toLowerCase();
      if (this.isLoading) return { success: false, error: 'Operation in progress' };

      // Prevent self-deletion
      if (email === this.currentUserData?.email) {
        this.showToast('You cannot delete your own account', 'error');
        return { success: false, error: 'Cannot delete own account' };
      }

      this.isLoading = true;
      this.showToast('Deactivating user account...', 'info');

      try {
        // Get current user data
        const userDoc = await window.firebaseDb.collection('userRoles').doc(normalizedEmail).get();
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const currentData = userDoc.data();
        const updateData = {
          active: false,
          status: 'disabled',
          deactivatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          deactivatedBy: this.currentUserData?.email || 'system',
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: this.currentUserData?.email || 'system',
        };

        // Update in Firebase (soft delete)
        await window.firebaseDb.collection('userRoles').doc(normalizedEmail).update(updateData);

        // Log the action
        await this.logAuditAction(
          'DELETE',
          normalizedEmail,
          currentData,
          { ...currentData, ...updateData },
          `Deactivated user account`
        );

        this.showToast(`User account deactivated successfully!`, 'success');
        return { success: true };
      } catch (error) {
        console.error('[ACCOUNTS-MANAGER] Delete user error:', error);
        this.showToast(`Failed to deactivate user: ${error.message}`, 'error');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    }

    // Reactivate user
    async reactivateUser(email) {
      const normalizedEmail = email.toLowerCase();
      if (this.isLoading) return { success: false, error: 'Operation in progress' };

      this.isLoading = true;
      this.showToast('Reactivating user account...', 'info');

      try {
        const userDoc = await window.firebaseDb.collection('userRoles').doc(normalizedEmail).get();
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const currentData = userDoc.data();
        const updateData = {
          active: true,
          status: 'active',
          reactivatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          reactivatedBy: this.currentUserData?.email || 'system',
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: this.currentUserData?.email || 'system',
        };

        // Update in Firebase
        await window.firebaseDb.collection('userRoles').doc(normalizedEmail).update(updateData);

        // Log the action
        await this.logAuditAction(
          'REACTIVATE',
          normalizedEmail,
          currentData,
          { ...currentData, ...updateData },
          `Reactivated user account`
        );

        this.showToast(`User account reactivated successfully!`, 'success');
        return { success: true };
      } catch (error) {
        console.error('[ACCOUNTS-MANAGER] Reactivate user error:', error);
        this.showToast(`Failed to reactivate user: ${error.message}`, 'error');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    }

    // Permanently Delete User (Hard Delete)
    async permanentlyDeleteUser(email) {
      const normalizedEmail = email.toLowerCase();
      if (this.isLoading) return { success: false, error: 'Operation in progress' };

      // Prevent self-deletion
      if (email === this.currentUserData?.email) {
        this.showToast('You cannot delete your own account', 'error');
        return { success: false, error: 'Cannot delete own account' };
      }

      this.isLoading = true;
      this.showToast('Permanently deleting user...', 'warning');

      try {
        const userDoc = await window.firebaseDb.collection('userRoles').doc(normalizedEmail).get();
        if (!userDoc.exists) {
          throw new Error('User not found');
        }
        const currentData = userDoc.data();

        // Hard Delete from Firestore
        await window.firebaseDb.collection('userRoles').doc(normalizedEmail).delete();

        // Attempt to clean up Auth (Note: This usually requires backend, but we'll try)
        // Since we can't easily delete from Auth client-side without credentials, we rely on Firestore deletion.
        // The Auth record will remain "orphaned" but useless without a Firestore profile.

        // Log the action (Audit log persists even if user is gone)
        await this.logAuditAction(
          'PERMANENT_DELETE',
          normalizedEmail,
          currentData,
          null,
          `Permanently deleted user account`
        );

        this.showToast(`User account permanently deleted.`, 'success');
        return { success: true };
      } catch (error) {
        console.error('[ACCOUNTS-MANAGER] Permanent delete error:', error);
        this.showToast(`Failed to delete user: ${error.message}`, 'error');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    }

    // Get all users
    async getAllUsers() {
      try {
        const snapshot = await window.firebaseDb.collection('userRoles').get();
        const users = [];
        snapshot.forEach(doc => {
          users.push({
            id: doc.id,
            email: doc.id,
            ...doc.data(),
          });
        });
        return { success: true, users };
      } catch (error) {
        console.error('[ACCOUNTS-MANAGER] Get users error:', error);
        return { success: false, error: error.message };
      }
    }

    // Initialize sample accounts with Firebase Auth + Firestore
    
    // Log audit actions
    async logAuditAction(action, targetUser, oldData, newData, description) {
      try {
        const auditData = {
          action: action,
          targetUser: targetUser,
          performedBy: this.currentUserData?.email || 'system',
          timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
          description: description,
          changes: {
            old: oldData,
            new: newData,
          },
          metadata: {
            userAgent: navigator.userAgent,
            ip: 'client-side', // In real app, get from server
          },
        };

        await window.firebaseDb.collection('accountAuditLog').add(auditData);
        console.log('[ACCOUNTS-MANAGER] Audit logged:', action);
      } catch (error) {
        console.error('[ACCOUNTS-MANAGER] Audit logging error:', error);
      }
    }

    // Get audit log
    async getAuditLog(limit = 50) {
      try {
        const snapshot = await window.firebaseDb
          .collection('accountAuditLog')
          .orderBy('timestamp', 'desc')
          .limit(limit)
          .get();

        const logs = [];
        snapshot.forEach(doc => {
          logs.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        return { success: true, logs };
      } catch (error) {
        console.error('[ACCOUNTS-MANAGER] Get audit log error:', error);
        return { success: false, error: error.message };
      }
    }

    // Validation helpers
    validateUserData(userData) {
      const { email, name, role, password, permissions } = userData;

      if (!email || !email.includes('@')) {
        this.showToast('Please provide a valid email address', 'error');
        return false;
      }

      if (!name || name.trim().length < 2) {
        this.showToast('Please provide a valid name (at least 2 characters)', 'error');
        return false;
      }

      if (!password || password.trim().length < 6) {
        this.showToast('Password must be at least 6 characters long', 'error');
        return false;
      }

      // [OVERHAUL] Permission validation
      // Role is now optional/deprecated in favor of granular permissions
      // We no longer validate 'role' against the legacy list if it's not provided.
      
      if (permissions) {
          const validLevels = ['none', 'view', 'edit'];
          const requiredKeys = ['dashboard', 'central', 'events', 'accounts'];
          for (const key of requiredKeys) {
              if (!validLevels.includes(permissions[key])) {
                  this.showToast(`Invalid permission level for ${key}`, 'error');
                  return false;
              }
          }
      }

      return true;
    }

    // Migrate legacy roles for local use
    migrateLegacyRole(role) {
      const perms = {
        dashboard: 'none', central: 'none', aquila: 'none', cetus: 'none', 
        cygnus: 'none', ursa: 'none', events: 'none', accounts: 'none'
      };

      if (!role) return perms; // Return all 'none' if no role

      if (role === 'FULL_ACCESS_EDIT') {
        Object.keys(perms).forEach(k => perms[k] = 'edit');
      } else if (role === 'FULL_ACCESS_VIEW') {
        Object.keys(perms).forEach(k => perms[k] = 'view');
      } else if (role === 'LIMITED_ACCESS_EDIT') {
        ['dashboard', 'aquila', 'cetus', 'cygnus', 'ursa', 'events'].forEach(k => perms[k] = 'edit');
      } else if (role === 'LIMITED_ACCESS_VIEW') {
        ['dashboard', 'aquila', 'cetus', 'cygnus', 'ursa', 'events'].forEach(k => perms[k] = 'view');
      }

      return perms;
    }

    // Get user by email
    getUserByEmail(email) {
      return this.currentUsers.find(user => user.email === email);
    }

    // Check if current user can manage accounts
    canManageAccounts() {
      return this.currentUserData?.role === 'FULL_ACCESS_EDIT';
    }

    // Show toast notifications
    showToast(message, type = 'info') {
      // Try multiple ways to show the toast
      if (window.accountsUI && window.accountsUI.showToast) {
        window.accountsUI.showToast(message, type);
      } else {
        // Dispatch custom event for UI to handle
        window.dispatchEvent(
          new CustomEvent('showToast', {
            detail: { message, type },
          })
        );
      }

      // Also log to console
      console.log(`[ACCOUNTS-MANAGER] ${type.toUpperCase()}: ${message}`);
    }

    // ========================================
    // FIREBASE AUTH DIAGNOSTIC TOOLS
    // ========================================

    async diagnoseFirebaseAuth() {
      console.log('🔍 === FIREBASE AUTH DIAGNOSTIC ===');

      // 1. Check Firebase Configuration
      console.log('\n1. 📋 Firebase Configuration:');
      try {
        const app = window.firebase?.app();
        if (app) {
          const config = app.options;
          console.log('✅ Firebase App initialized');
          console.log('   Project ID:', config.projectId);
          console.log('   Auth Domain:', config.authDomain);
          console.log('   API Key:', config.apiKey?.substring(0, 20) + '...');
        } else {
          console.error('❌ Firebase app not initialized');
          return false;
        }
      } catch (error) {
        console.error('❌ Firebase config error:', error);
        return false;
      }

      // 2. Check Firebase Auth Service
      console.log('\n2. 🔐 Firebase Auth Service:');
      if (window.firebaseAuth) {
        console.log('✅ Firebase Auth service available');
        console.log('   Current User:', window.firebaseAuth.currentUser?.email || 'None');
        console.log('   Auth Ready:', !!window.firebaseAuth.currentUser);
      } else {
        console.error('❌ Firebase Auth service not available');
        return false;
      }

      // 3. Check Auth Provider Settings
      console.log('\n3. ⚙️ Checking Auth Settings...');
      try {
        console.log('   Auth Domain:', window.firebaseAuth.app.options.authDomain);
        console.log('   API Key Valid:', !!window.firebaseAuth.app.options.apiKey);
      } catch (error) {
        console.error('❌ Auth settings error:', error);
      }

      // 4. Test Basic Auth Operations
      console.log('\n4. 🧪 Testing Auth Operations:');

      if (window.firebaseAuth.createUserWithEmailAndPassword) {
        console.log('✅ createUserWithEmailAndPassword method available');
      } else {
        console.error('❌ createUserWithEmailAndPassword method not available');
        return false;
      }

      // Test user creation
      const testEmail = `test-${Date.now()}@example.com`;
      const testPassword = 'testpass123';

      console.log(`   Testing user creation: ${testEmail}`);

      try {
        const userCredential = await window.firebaseAuth.createUserWithEmailAndPassword(
          testEmail,
          testPassword
        );
        console.log('✅ Test user creation successful!');
        console.log('   User UID:', userCredential.user.uid);
        console.log('   User Email:', userCredential.user.email);

        // Clean up test user
        console.log('   Cleaning up test user...');
        await userCredential.user.delete();
        console.log('✅ Test user deleted');

        this.showToast('✅ Firebase Auth is working correctly!', 'success');
      } catch (error) {
        console.error('❌ Test user creation failed:', error);
        console.error('   Error Code:', error.code);
        console.error('   Error Message:', error.message);

        // Analyze the error
        let solution = '';
        switch (error.code) {
          case 'auth/operation-not-allowed':
            solution =
              '💡 SOLUTION: Enable Email/Password authentication in Firebase Console\n   1. Go to Firebase Console → Authentication → Sign-in method\n   2. Enable "Email/Password" provider';
            this.showToast(
              '❌ Email/Password authentication is disabled in Firebase Console',
              'error'
            );
            break;

          case 'auth/weak-password':
            solution = '💡 Password too weak (need 6+ chars)';
            break;

          case 'auth/email-already-in-use':
            solution = '💡 Email already exists (this is actually good news)';
            break;

          case 'auth/invalid-email':
            solution = '💡 Invalid email format';
            break;

          case 'auth/network-request-failed':
            solution = '💡 Network issue - check internet connection';
            this.showToast('❌ Network error - check internet connection', 'error');
            break;

          case 'auth/too-many-requests':
            solution = '💡 Too many requests - wait a moment';
            this.showToast('❌ Too many requests - please wait', 'warning');
            break;

          default:
            solution = '💡 Unknown error - check Firebase Console for more details';
            this.showToast(`❌ Auth error: ${error.message}`, 'error');
        }

        console.log(solution);
        return false;
      }

      // 5. Check Firestore Connection
      console.log('\n5. 📦 Firestore Connection:');
      if (window.firebaseDb) {
        console.log('✅ Firestore service available');
        try {
          await window.firebaseDb.collection('_test').doc('test').set({ test: true });
          await window.firebaseDb.collection('_test').doc('test').delete();
          console.log('✅ Firestore read/write working');
        } catch (error) {
          console.error('❌ Firestore test failed:', error);
        }
      } else {
        console.error('❌ Firestore service not available');
      }

      // 6. Check Current User Permissions
      console.log('\n6. 👤 Current User Check:');
      const currentUser = window.firebaseAuth.currentUser;
      if (currentUser) {
        console.log('✅ User is logged in:', currentUser.email);

        try {
          const userDoc = await window.firebaseDb
            .collection('userRoles')
            .doc(currentUser.email)
            .get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            console.log('   User Role:', userData.role);
            console.log('   User Active:', userData.active);

            if (userData.role === 'FULL_ACCESS_EDIT') {
              console.log('✅ User has admin privileges');
            } else {
              console.log('⚠️ User does not have admin privileges');
            }
          }
        } catch (error) {
          console.error('❌ Failed to check user role:', error);
        }
      } else {
        console.log('⚠️ No user currently logged in');
      }

      console.log('\n🔍 === DIAGNOSTIC COMPLETE ===');
      return true;
    }

    checkFirebaseConsoleSettings() {
      console.log('📋 Firebase Console Checklist:');
      console.log('1. Go to: https://console.firebase.google.com');
      console.log(`2. Select project: ${window.firebase?.app()?.options?.projectId}`);
      console.log('3. Navigate to: Authentication → Sign-in method');
      console.log('4. Check if "Email/Password" is ENABLED');
      console.log('5. If not enabled, click on it and toggle "Enable"');
      console.log('6. Save changes');
      console.log('\nAlso check:');
      console.log('- Authentication → Settings → Authorized domains');
      console.log('- Make sure your domain is listed there');

      this.showToast('📋 Check console for Firebase setup instructions', 'info');
    }

    async manualCreateUser(email, password, name = 'Test User') {
      console.log(`🔨 Manually creating user: ${email}`);

      try {
        // Step 1: Create Firebase Auth user
        console.log('Step 1: Creating Firebase Auth user...');
        const userCredential = await window.firebaseAuth.createUserWithEmailAndPassword(
          email,
          password
        );
        console.log('✅ Firebase Auth user created:', userCredential.user.uid);

        // Step 2: Create Firestore profile
        console.log('Step 2: Creating Firestore profile...');
        const userData = {
          name: name,
          role: 'LIMITED_ACCESS_VIEW',
          active: true,
          status: 'active',
          firebaseUid: userCredential.user.uid,
          emailVerified: userCredential.user.emailVerified,
          createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: 'manual-creation',
        };

        await window.firebaseDb.collection('userRoles').doc(email).set(userData);
        console.log('✅ Firestore profile created');

        console.log('🎉 Manual user creation complete!');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        console.log(`   UID: ${userCredential.user.uid}`);

        this.showToast(`✅ Manual user created: ${email}`, 'success');
        return { success: true, user: userCredential.user, userData };
      } catch (error) {
        console.error('❌ Manual user creation failed:', error);
        this.showToast(`❌ Manual creation failed: ${error.message}`, 'error');
        return { success: false, error };
      }
    }

    async testUserLogin(email, password) {
      console.log(`🔐 Testing login: ${email}`);

      try {
        const userCredential = await window.firebaseAuth.signInWithEmailAndPassword(
          email,
          password
        );
        console.log('✅ Login test successful!');
        console.log('User UID:', userCredential.user.uid);
        console.log('User Email:', userCredential.user.email);

        this.showToast(`✅ Login test successful: ${email}`, 'success');
        return { success: true, user: userCredential.user };
      } catch (error) {
        console.error('❌ Login test failed:', error);
        console.error('Error code:', error.code);

        this.showToast(`❌ Login test failed: ${error.message}`, 'error');
        return { success: false, error };
      }
    }

    async checkExistingUsers() {
      console.log('👥 Checking existing users...');

      try {
        // Get Firestore users
        const firestoreSnapshot = await window.firebaseDb.collection('userRoles').get();
        const firestoreUsers = [];
        firestoreSnapshot.forEach(doc => {
          firestoreUsers.push({
            email: doc.id,
            data: doc.data(),
          });
        });

        console.log('📊 Firestore Users:', firestoreUsers.length);
        console.table(
          firestoreUsers.map(u => ({
            email: u.email,
            name: u.data.name,
            role: u.data.role,
            hasFirebaseUid: !!u.data.firebaseUid,
            active: u.data.active,
          }))
        );

        // Check which users have Firebase UIDs
        const usersWithAuth = firestoreUsers.filter(u => u.data.firebaseUid).length;
        const usersWithoutAuth = firestoreUsers.filter(u => !u.data.firebaseUid).length;

        console.log(`✅ Users with Firebase Auth: ${usersWithAuth}`);
        console.log(`❌ Users without Firebase Auth: ${usersWithoutAuth}`);

        this.showToast(
          `📊 Found ${firestoreUsers.length} users (${usersWithoutAuth} need Auth setup)`,
          'info'
        );

        return firestoreUsers;
      } catch (error) {
        console.error('❌ Error checking users:', error);
        this.showToast('❌ Failed to check existing users', 'error');
        return [];
      }
    }
  }

  // Initialize and expose globally
  if (window.accountsManager) {
    console.log('[ACCOUNTS-MANAGER] Already initialized.');
    return;
  }
  window.accountsManager = new AccountsManager();
})();
