// Enhanced logout script with proper Firebase authentication logout, audit logging, and edit manager cache clearing

// Ensure Firebase is available
if (typeof firebase !== 'undefined') {
  window.firebaseAuth = firebase.auth();
}

/**
 * Create and show beautiful logout confirmation modal
 */
function showLogoutModal() {
  // Remove existing modal if present
  const existingModal = document.getElementById('logoutModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal HTML
  const modalHTML = `
        <div id="logoutModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 opacity-0 transition-all duration-300">
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform scale-95 transition-all duration-300">
                <!-- Modal Header -->
                <div class="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-2xl">
                    <div class="flex items-center">
                        <div class="bg-white bg-opacity-20 rounded-full p-2 mr-3">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-xl font-bold">Confirm Logout</h3>
                            <p class="text-red-100 text-sm">Are you sure you want to sign out?</p>
                        </div>
                    </div>
                </div>

                <!-- Modal Body -->
                <div class="p-6">
                    <div class="flex items-start mb-4">
                        <div class="bg-red-100 rounded-full p-2 mr-3">
                            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                            </svg>
                        </div>
                        <div>
                            <p class="text-gray-700 mb-2">You will be signed out of your account and redirected to the login page.</p>
                            <p class="text-sm text-gray-500">Any unsaved changes will be lost.</p>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end space-x-3">
                    <button onclick="cancelLogout()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200 font-medium">
                        Cancel
                    </button>
                    <button onclick="confirmLogout()" class="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-lg">
                        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                        </svg>
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    `;

  // Add modal to page
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Show modal with animation
  const modal = document.getElementById('logoutModal');
  const modalContent = modal.querySelector('.bg-white');

  // Trigger animations
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    modal.classList.add('opacity-100');
    modalContent.classList.remove('scale-95');
    modalContent.classList.add('scale-100');
  }, 10);

  // Close modal on background click
  modal.addEventListener('click', function (e) {
    if (e.target === modal) {
      cancelLogout();
    }
  });

  // Close modal on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      cancelLogout();
    }
  });
}

/**
 * Cancel logout and close modal
 */
function cancelLogout() {
  const modal = document.getElementById('logoutModal');
  if (modal) {
    const modalContent = modal.querySelector('.bg-white');

    // Animate out
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-95');

    // Remove modal after animation
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

/**
 * 🆕 Clear edit manager and system caches
 */
function clearEditManagerCaches() {
  console.log('🧹 Clearing edit manager and system caches...');

  try {
    // 1. Clear all role caches from localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('userRole_') || key.startsWith('userRole_cached_'))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed cache key: ${key}`);
    });

    // 2. Clear edit manager state
    if (window.prefectManager) {
      window.prefectManager.editEnabled = false;
      window.prefectManager.currentEditData = null;
      window.prefectManager.currentEditId = null;
      if (window.prefectManager.offenseMap) {
        window.prefectManager.offenseMap.clear();
      }
      console.log('✅ Edit manager state cleared');
    }

    // 3. Clear any open edit modals
    const editModal = document.getElementById('editPrefectModal');
    if (editModal) {
      editModal.classList.add('hidden');
      console.log('✅ Edit modal closed');
    }

    // 4. Clear add prefect modal
    const addModal = document.getElementById('addPrefectModal');
    if (addModal) {
      addModal.classList.add('hidden');
      console.log('✅ Add prefect modal closed');
    }

    // 5. Reset edit manager initialization flag
    if (typeof window.editManagerInitialized !== 'undefined') {
      window.editManagerInitialized = undefined;
      console.log('✅ Edit manager initialization flag reset');
    }

    // 6. Clear event manager caches if available
    if (window.eventManager && window.eventManager.cache) {
      window.eventManager.cache.clear();
      console.log('✅ Event manager cache cleared');
    }

    // 7. Clear audit manager state
    if (window.auditLogManager) {
      if (window.auditLogManager.unsubscribeAuditLog) {
        window.auditLogManager.unsubscribeAuditLog();
      }
      window.auditLogManager.isListening = false;
      console.log('✅ Audit manager state cleared');
    }

    console.log('✅ All edit manager and system caches cleared successfully');
  } catch (error) {
    console.error('⚠️ Error clearing edit manager caches:', error);
  }
}

/**
 * Confirm logout with proper Firebase authentication logout, audit logging, and cache clearing
 */
async function confirmLogout() {
  const modal = document.getElementById('logoutModal');
  const confirmButton = modal.querySelector('button[onclick="confirmLogout()"]');
  const cancelButton = modal.querySelector('button[onclick="cancelLogout()"]');

  // Show loading state
  confirmButton.innerHTML = `
        <svg class="animate-spin w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-opacity="0.25"></circle>
            <path fill="currentColor" stroke-opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Signing Out...
    `;
  confirmButton.disabled = true;
  cancelButton.disabled = true;

  console.log('🔄 Starting logout process...');

  try {
    // 1. Get current user info before logout for audit logging
    const currentUser = firebase ? firebase.auth().currentUser : null;
    let userName = null;
    let userEmail = null;

    if (currentUser) {
      userEmail = currentUser.email;
      userName = currentUser.displayName || userEmail;

      // Try to get full name from userRoles collection
      try {
        if (firebase && firebase.firestore) {
          const userDoc = await firebase.firestore().collection('userRoles').doc(userEmail).get();
          if (userDoc.exists) {
            userName = userDoc.data().name || userName;
          }
        }
      } catch (nameError) {
        console.log('⚠️ Could not fetch user name:', nameError);
      }
    }

    // 2. Log logout before signing out
    if (currentUser && window.auditLog) {
      console.log('📝 Logging user logout...');
      try {
        await window.auditLog.logUserLogout(userEmail, userName);
        console.log('✅ Logout audit logged successfully');
      } catch (auditError) {
        console.log('⚠️ Audit logging failed:', auditError);
        // Don't fail logout for audit issues
      }
    } else {
      console.log('⚠️ No current user or audit system not available');
    }

    // 3. 🆕 Clear edit manager and system caches BEFORE Firebase logout
    confirmButton.innerHTML = `
            <svg class="animate-spin w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-opacity="0.25"></circle>
                <path fill="currentColor" stroke-opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Clearing Cache...
        `;
    clearEditManagerCaches();

    // 4. Sign out from Firebase Authentication
    if (window.firebaseAuth || firebase) {
      console.log('🔥 Signing out from Firebase...');
      confirmButton.innerHTML = `
                <svg class="animate-spin w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-opacity="0.25"></circle>
                    <path fill="currentColor" stroke-opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Firebase Logout...
            `;
      const authInstance = window.firebaseAuth || firebase.auth();
      await authInstance.signOut();
      console.log('✅ Firebase signout successful');
    } else {
      console.log('⚠️ Firebase Auth not available');
    }

    // 5. Clear all stored data
    console.log('🧹 Clearing stored data...');
    confirmButton.innerHTML = `
            <svg class="animate-spin w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-opacity="0.25"></circle>
                <path fill="currentColor" stroke-opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Clearing Storage...
        `;
    try {
      localStorage.clear();
      sessionStorage.clear();

      // Clear any cookies related to Firebase
      document.cookie.split(';').forEach(function (c) {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });

      console.log('✅ Storage and cookies cleared');
    } catch (error) {
      console.log('⚠️ Storage clear failed:', error);
    }

    // 6. Clear auth system state
    if (window.authSystem) {
      window.authSystem.currentUser = null;
      window.authSystem.userRole = null;
      window.authSystem.authCheckCompleted = false;
      console.log('✅ Auth system state cleared');
    }

    // 7. Clear auth manager state
    if (window.authManager) {
      window.authManager.currentUser = null;
      window.authManager.userRole = null;
      console.log('✅ Auth manager state cleared');
    }

    // 8. Show success message briefly, then redirect
    setTimeout(() => {
      confirmButton.innerHTML = `
                <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Success!
            `;
      confirmButton.classList.remove(
        'from-red-500',
        'to-red-600',
        'hover:from-red-600',
        'hover:to-red-700'
      );
      confirmButton.classList.add('from-green-500', 'to-green-600');

      // 9. Redirect to login page after brief delay
      setTimeout(() => {
        console.log('🚀 Redirecting to login page...');
        window.location.href = 'index.html';
      }, 800);
    }, 1000);
  } catch (error) {
    console.error('❌ Logout error:', error);

    // Show error message
    confirmButton.innerHTML = `
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            Error - Retrying...
        `;

    // Force redirect even if there's an error
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
  }
}

/**
 * Main logout function that shows the beautiful modal
 */
function logout() {
  showLogoutModal();
}

/**
 * Handle logout function (compatible with your existing button onclick)
 */
function handleLogout() {
  logout();
}

/**
 * Quick logout without confirmation (for emergency use)
 */
async function quickLogout() {
  console.log('🚀 Quick logout initiated');

  try {
    // Get current user for audit logging
    const currentUser = firebase ? firebase.auth().currentUser : null;

    // Log logout if possible
    if (currentUser && window.auditLog) {
      try {
        await window.auditLog.logUserLogout(
          currentUser.email,
          currentUser.displayName || currentUser.email
        );
      } catch (auditError) {
        console.log('⚠️ Quick logout audit failed:', auditError);
      }
    }

    // 🆕 Clear edit manager caches
    clearEditManagerCaches();

    // Firebase signout
    if (window.firebaseAuth || firebase) {
      const authInstance = window.firebaseAuth || firebase.auth();
      await authInstance.signOut();
    }

    // Clear storage
    localStorage.clear();
    sessionStorage.clear();

    // Clear cookies
    document.cookie.split(';').forEach(function (c) {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });

    // Clear auth states
    if (window.authSystem) {
      window.authSystem.currentUser = null;
      window.authSystem.userRole = null;
    }
    if (window.authManager) {
      window.authManager.currentUser = null;
      window.authManager.userRole = null;
    }
  } catch (error) {
    console.log('⚠️ Quick logout error:', error);
  }

  // Always redirect regardless of errors
  window.location.href = 'index.html';
}

/**
 * Show success notification
 */
function showSuccessNotification(message) {
  const notification = document.createElement('div');
  notification.className =
    'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
  notification.innerHTML = `
        <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            ${message}
        </div>
    `;

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.classList.remove('translate-x-full');
    notification.classList.add('translate-x-0');
  }, 10);

  // Remove after delay
  setTimeout(() => {
    notification.classList.remove('translate-x-0');
    notification.classList.add('translate-x-full');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Make functions globally available
window.logout = logout;
window.handleLogout = handleLogout;
window.quickLogout = quickLogout;
window.showLogoutModal = showLogoutModal;
window.cancelLogout = cancelLogout;
window.confirmLogout = confirmLogout;
window.clearEditManagerCaches = clearEditManagerCaches; // 🆕 Make cache clearing available globally

console.log('🎨 Enhanced logout script loaded with edit manager cache clearing');
console.log(
  '💡 Available functions: logout(), handleLogout(), quickLogout(), clearEditManagerCaches()'
);

// Add custom styles for animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideIn {
        from { transform: scale(0.95) translateY(-10px); opacity: 0; }
        to { transform: scale(1) translateY(0); opacity: 1; }
    }
    
    .logout-modal-enter {
        animation: fadeIn 0.3s ease-out;
    }
    
    .logout-modal-content-enter {
        animation: slideIn 0.3s ease-out;
    }
    
    /* Loading spinner animation */
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .animate-spin {
        animation: spin 1s linear infinite;
    }
`;

document.head.appendChild(styleSheet);
