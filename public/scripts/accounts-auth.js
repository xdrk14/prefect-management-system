// Account Management Authentication Controller
// File: public/scripts/accounts-auth.js
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async function () {
    console.log('[ACCOUNTS-AUTH] Waiting for Auth Manager...');
    
    // Wait for auth manager to be ready
    const waitForAuth = () => {
        return new Promise(resolve => {
            // If already loaded
            if (window.authManager && window.authManager.currentUser) {
                resolve();
                return;
            }
            // Listen for ready event
            window.addEventListener('auth:ready', () => resolve(), { once: true });
            
            // Fallback: Check constantly
            const checkInterval = setInterval(() => {
                if (window.authManager && window.authManager.currentUser) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 200);

            // Timeout after 5 seconds to prevent hanging
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 5000);
        });
    };

    await waitForAuth();
    
    // Auth Check
    if (!window.authManager || !window.authManager.currentUser) {
        console.warn('[ACCOUNTS-AUTH] No authenticated user found. Redirecting...');
        window.location.href = 'index.html';
        return;
    }

    const email = window.authManager.currentUser.email;
    console.log('[ACCOUNTS-AUTH] Verifying permissions for:', email);

    // Granular Permission Check
    // We check for 'view' access. 'edit' implies 'view'.
    if (!window.authManager.hasPermission('accounts', 'view')) {
         console.warn('[ACCOUNTS-AUTH] 🚫 Access Denied: Insufficient permissions for Accounts page.');
         const container = document.getElementById('accountsContent') || document.body;
         container.innerHTML = `
            <div class="flex items-center justify-center h-screen bg-gray-100">
                <div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                    <svg class="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                    </svg>
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                    <p class="text-gray-600 mb-6">You do not have permission to view this page.</p>
                    <a href="main.html" class="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">Return to Home</a>
                </div>
            </div>
         `;
         // Ensure content is visible if we just injected the error
         document.getElementById('accountsContent')?.classList.remove('hidden');
         document.getElementById('loadingState')?.classList.add('hidden');
         return;
    }

    console.log('[ACCOUNTS-AUTH] ✅ Permission granted. Initializing UI...');
    
    // Show UI
    const loadingState = document.getElementById('loadingState');
    if (loadingState) loadingState.classList.add('hidden');

    const accountsContent = document.getElementById('accountsContent');
    if (accountsContent) accountsContent.classList.remove('hidden');

    // Init UI with current user context
    if (window.accountsUI) {
        // If view-only, UI should handle disabling buttons, but let's reinforce
        const canEdit = window.authManager.hasPermission('accounts', 'edit');
        if (!canEdit) {
            document.body.classList.add('view-only');
            // Hide specific add buttons immediately
            const addBtn = document.getElementById('addUserBtn');
            if (addBtn) addBtn.style.display = 'none';
        }
        
        window.accountsUI.refreshData();
    }
  });

  // Global logout (defer to accountsUI for premium modal)
  window.handleLogout = function () {
    if (window.accountsUI) {
      window.accountsUI.handleLogout();
    } else {
        // Fallback for pages without accountsUI but with tailwind
        const modalHTML = `
            <div id="logoutModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] px-4">
                <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full transform transition-all p-6 text-center">
                    <h3 class="text-xl font-bold text-gray-900 mb-2">Logout?</h3>
                    <p class="text-gray-600 mb-6">Are you sure you want to leave?</p>
                    <div class="flex space-x-3">
                        <button onclick="this.closest('#logoutModal').remove()" class="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
                        <button id="finalLogoutBtn" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">Logout</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.getElementById('finalLogoutBtn').onclick = () => {
             if (window.firebaseAuth) window.firebaseAuth.signOut().then(() => window.location.href = 'index.html');
             else window.location.href = 'index.html';
        };
    }
  };
})();
