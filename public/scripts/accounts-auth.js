// Account Management Authentication Controller
// File: public/scripts/accounts-auth.js
(function () {
  'use strict';

  // Main authentication and initialization logic
  document.addEventListener('DOMContentLoaded', function () {
    console.log('[AUTH] DOM loaded, starting authentication check...');

    // Check Firebase availability and start auth flow
    checkFirebaseAndStartAuth();
  });

  function checkFirebaseAndStartAuth() {
    console.log('[AUTH] Checking Firebase availability...');

    let attempts = 0;
    const maxAttempts = 30; // 15 seconds

    const checkFirebase = () => {
      attempts++;
      console.log(`[AUTH] Firebase check attempt ${attempts}/${maxAttempts}`);

      if (window.firebaseAuth && window.firebaseDb) {
        console.log('[AUTH] ✅ Firebase loaded successfully!');
        setupAuthListener();
      } else if (attempts >= maxAttempts) {
        console.error('[AUTH] ❌ Firebase failed to load after max attempts');
        showError(
          'Firebase failed to initialize. Please check your internet connection and refresh the page.'
        );
      } else {
        setTimeout(checkFirebase, 500);
      }
    };

    checkFirebase();
  }

  function setupAuthListener() {
    console.log('[AUTH] Setting up authentication listener...');

    try {
      window.firebaseAuth.onAuthStateChanged(async user => {
        console.log(`[AUTH] Auth state changed: ${user ? user.email : 'No user'}`);

        if (!user) {
          console.log('[AUTH] No user authenticated, redirecting to login...');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 2000);
          return;
        }

        console.log(`[AUTH] User authenticated: ${user.email}`);

        try {
          // Check user permissions
          const userDoc = await window.firebaseDb.collection('userRoles').doc(user.email).get();

          if (!userDoc.exists) {
            console.error('[AUTH] User not found in database');
            showAccessDenied('User not found in system database');
            return;
          }

          const userData = userDoc.data();
          console.log(`[AUTH] User role: ${userData.role}, Active: ${userData.active}`);

          if (!userData.active) {
            console.error('[AUTH] User account is inactive');
            showAccessDenied('Your account has been deactivated');
            return;
          }

          if (userData.role !== 'FULL_ACCESS_EDIT') {
            console.warn(`[AUTH] Insufficient permissions: ${userData.role}`);
            showAccessDenied('You need administrator privileges to access account management');

            // Update the access denied screen with current role info
            const currentUserRoleEl = document.getElementById('currentUserRole');
            if (currentUserRoleEl) {
              currentUserRoleEl.textContent = `Current Role: ${userData.role}`;
            }
            return;
          }

          console.log('[AUTH] ✅ Access granted! Loading accounts interface...');
          showAccountsInterface(user, userData);
        } catch (error) {
          console.error('[AUTH] Permission check error:', error);
          showError('Failed to verify permissions: ' + error.message);
        }
      });
    } catch (error) {
      console.error('[AUTH] Auth listener setup error:', error);
      showError('Authentication setup failed: ' + error.message);
    }
  }

  function showAccountsInterface(user, userData) {
    console.log('[AUTH] Showing accounts interface for:', user.email);

    // Hide loading state
    const loadingState = document.getElementById('loadingState');
    if (loadingState) loadingState.classList.add('hidden');

    // Show main content
    const accountsContent = document.getElementById('accountsContent');
    if (accountsContent) accountsContent.classList.remove('hidden');

    // Initialize the accounts UI if it exists
    if (window.accountsUI) {
      // Load initial data
      setTimeout(() => {
        window.accountsUI.refreshData();
      }, 500);
    }

    console.log('[AUTH] ✅ Accounts interface loaded successfully');
  }

  function showAccessDenied(reason = '') {
    console.log(`[AUTH] Access denied: ${reason}`);

    // Hide loading state
    const loadingState = document.getElementById('loadingState');
    if (loadingState) loadingState.classList.add('hidden');

    // Show access denied
    const accessDenied = document.getElementById('accessDenied');
    if (accessDenied) accessDenied.classList.remove('hidden');

    // Update reason if provided
    if (reason) {
      const reasonElement = accessDenied.querySelector('p');
      if (reasonElement) {
        reasonElement.textContent = reason;
      }
    }
  }

  function showError(message) {
    console.error(`[AUTH] Error: ${message}`);

    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
      loadingState.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-red-600 mb-4">
                        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                    </div>
                    <h2 class="text-2xl font-bold text-red-600 mb-2">Authentication Error</h2>
                    <p class="text-gray-600 mb-4">${message}</p>
                    <div class="space-y-2">
                        <button onclick="location.reload()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            Retry
                        </button>
                        <br>
                        <a href="main.html" class="text-blue-600 hover:text-blue-800 underline">
                            Return to Dashboard
                        </a>
                    </div>
                </div>
            `;
    }
  }

  // Global logout function for navigation
  window.handleLogout = function () {
    if (confirm('Are you sure you want to logout?')) {
      console.log('[AUTH] Logout initiated');

      if (window.firebaseAuth) {
        window.firebaseAuth
          .signOut()
          .then(() => {
            console.log('[AUTH] Firebase signOut successful');
            window.location.href = 'index.html';
          })
          .catch(error => {
            console.error('[AUTH] Logout error:', error);
            window.location.href = 'index.html';
          });
      } else {
        console.warn('[AUTH] Firebase auth not available, redirecting directly');
        window.location.href = 'index.html';
      }
    }
  };
})();
