// Account Management UI Controller - Clean Final Version
// File: public/scripts/accounts-ui.js
(function () {
  'use strict';

  class AccountsUI {
    constructor() {
      this.filteredUsers = [];
      this.currentEditingUser = null;
      this.isEditMode = false;
      this.formSubmissionInProgress = false;
      this.init();
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    init() {
      console.log('[ACCOUNTS-UI] Initializing...');
      this.setupEventListeners();
      this.setupToastHandler();
    }

    setupEventListeners() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.bindEvents());
      } else {
        this.bindEvents();
      }
    }

    setupToastHandler() {
      window.addEventListener('showToast', e => {
        this.showToast(e.detail.message, e.detail.type);
      });
    }

    // ========================================
    // EVENT BINDING
    // ========================================

    bindEvents() {
      console.log('[ACCOUNTS-UI] Binding events...');

      this.bindButtonEvents();
      this.bindFormEvents();
      this.bindFilterEvents();
      this.bindModalEvents();
      this.bindKeyboardEvents();

      console.log('[ACCOUNTS-UI] All events bound successfully');
    }

    bindButtonEvents() {
      const buttons = {
        logoutBtn: () => this.handleLogout(),
        mobileLogoutBtn: () => this.handleLogout(),
        accessDeniedLogoutBtn: () => this.handleLogout(),
        refreshBtn: () => this.refreshData(),
        sampleBtn: () => this.initializeSampleAccounts(),
        testFirebaseBtn: () => this.testFirebaseConnection(),
        addUserBtn: () => this.openCreateModal(),
        closeModalBtn: () => this.closeModal(),
        cancelBtn: () => this.closeModal(),
      };

      Object.entries(buttons).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) element.addEventListener('click', handler);
      });
    }

    bindFormEvents() {
      const userForm = document.getElementById('userForm');
      if (userForm) {
        userForm.addEventListener('submit', e => this.handleFormSubmit(e));
        console.log('[ACCOUNTS-UI] ✅ Form submit handler bound');
      }

      const userRole = document.getElementById('userRole');
      if (userRole) {
        userRole.addEventListener('change', () => this.updatePermissionDisplay());
      }
    }

    bindFilterEvents() {
      const filters = {
        searchInput: 'input',
        roleFilter: 'change',
        statusFilter: 'change',
      };

      Object.entries(filters).forEach(([id, event]) => {
        const element = document.getElementById(id);
        if (element) {
          element.addEventListener(event, () => this.filterUsers());
          console.log(`[ACCOUNTS-UI] ${id} bound`);
        }
      });
    }

    bindModalEvents() {
      const modal = document.getElementById('userModal');
      if (modal) {
        modal.addEventListener('click', e => {
          if (e.target === modal || e.target.classList.contains('modal-overlay')) {
            this.closeModal();
          }
        });
      }
    }

    bindKeyboardEvents() {
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') this.closeModal();
      });
    }

    bindTableActionButtons() {
      const actions = {
        edit: email => this.editUser(email),
        delete: email => this.deleteUser(email),
        reactivate: email => this.reactivateUser(email),
      };

      Object.entries(actions).forEach(([action, handler]) => {
        document.querySelectorAll(`[data-action="${action}"]`).forEach(btn => {
          btn.addEventListener('click', e => {
            const email = e.target.closest('button').dataset.email;
            handler(email);
          });
        });
      });
    }

    // ========================================
    // AUTHENTICATION & UTILITIES
    // ========================================

    async handleLogout() {
      this.showLogoutModal();
    }

    showLogoutModal() {
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
                            <button id="cancelLogoutBtn" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200 font-medium">
                                Cancel
                            </button>
                            <button id="confirmLogoutBtn" class="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-lg">
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

      // Bind events
      const cancelBtn = document.getElementById('cancelLogoutBtn');
      const confirmBtn = document.getElementById('confirmLogoutBtn');

      cancelBtn.addEventListener('click', () => this.cancelLogout());
      confirmBtn.addEventListener('click', () => this.confirmLogout());

      // Trigger animations
      setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
        modalContent.classList.remove('scale-95');
        modalContent.classList.add('scale-100');
      }, 10);

      // Close modal on background click
      modal.addEventListener('click', e => {
        if (e.target === modal) {
          this.cancelLogout();
        }
      });

      // Close modal on Escape key
      const escapeHandler = e => {
        if (e.key === 'Escape') {
          this.cancelLogout();
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);
    }

    cancelLogout() {
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

    async confirmLogout() {
      const modal = document.getElementById('logoutModal');
      const confirmButton = document.getElementById('confirmLogoutBtn');
      const cancelButton = document.getElementById('cancelLogoutBtn');

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
        // 1. Sign out from Firebase Authentication
        if (window.firebaseAuth) {
          console.log('🔥 Signing out from Firebase...');
          await window.firebaseAuth.signOut();
          console.log('✅ Firebase signout successful');
        } else {
          console.log('⚠️ Firebase Auth not available');
        }

        // 2. Clear all stored data
        console.log('🧹 Clearing stored data...');
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

        // 3. Clear auth system state
        if (window.authSystem) {
          window.authSystem.currentUser = null;
          window.authSystem.userRole = null;
          window.authSystem.authCheckCompleted = false;
          console.log('✅ Auth system state cleared');
        }

        // 4. Clear auth manager state
        if (window.authManager) {
          window.authManager.currentUser = null;
          window.authManager.userRole = null;
          console.log('✅ Auth manager state cleared');
        }

        // 5. Show success message briefly, then redirect
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

          // 6. Redirect to login page after brief delay
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

    testFirebaseConnection() {
      console.log('[ACCOUNTS-UI] Testing Firebase connection...');

      if (window.accountsManager?.testFirebaseConnection) {
        window.accountsManager.testFirebaseConnection();
      } else {
        this.showToast('🔥 Firebase appears to be working! (Basic test)', 'success');
        console.log('Firebase Auth:', !!window.firebaseAuth);
        console.log('Firebase DB:', !!window.firebaseDb);
        console.log('Accounts Manager:', !!window.accountsManager);
      }

      // Also show available diagnostic functions
      setTimeout(() => {
        console.log('\n🛠️ Available Diagnostic Functions:');
        console.log('  - window.accountsManager.diagnoseFirebaseAuth()');
        console.log('  - window.accountsManager.checkFirebaseConsoleSettings()');
        console.log('  - window.accountsManager.manualCreateUser(email, password, name)');
        console.log('  - window.accountsManager.testUserLogin(email, password)');
        console.log('  - window.accountsManager.checkExistingUsers()');
      }, 1000);
    }

    async refreshData() {
      console.log('[ACCOUNTS-UI] Refreshing data...');

      if (!window.accountsManager) {
        console.warn('[ACCOUNTS-UI] Accounts manager not available');
        return;
      }

      const result = await window.accountsManager.getAllUsers();
      if (result?.success) {
        this.updateUserTable(result.users);
        this.updateStats(result.users);
        console.log('[ACCOUNTS-UI] Data refreshed successfully');
      } else {
        console.error('[ACCOUNTS-UI] Failed to refresh data:', result?.error);
      }
    }

    async initializeSampleAccounts() {
      const confirmed = confirm('This will create 8 sample user accounts for testing.\n\nProceed?');
      if (confirmed) {
        const result = await window.accountsManager?.initializeSampleAccounts();
        if (result?.success) {
          setTimeout(() => this.refreshData(), 1000);
        }
      }
    }

    // ========================================
    // FORM HANDLING
    // ========================================

    async handleFormSubmit(e) {
      e.preventDefault();
      e.stopPropagation();

      console.log('[ACCOUNTS-UI] Form submitted!');

      if (this.formSubmissionInProgress) {
        this.showToast('⏳ Please wait, processing...', 'warning');
        return;
      }

      if (!window.accountsManager?.isFirebaseReady()) {
        this.showToast('❌ Firebase not ready. Please wait and try again.', 'error');
        return;
      }

      this.formSubmissionInProgress = true;

      try {
        const userData = this.getFormData(e.target);
        const submitBtn = e.target.querySelector('[type="submit"]');
        const originalText = submitBtn?.textContent;

        this.setButtonLoading(submitBtn, true);

        const result = this.isEditMode
          ? await this.updateExistingUser(userData)
          : await this.createNewUser(userData);

        this.setButtonLoading(submitBtn, false, originalText);

        if (result?.success) {
          console.log('[ACCOUNTS-UI] ✅ Form submission successful');
          this.closeModal();
          setTimeout(() => this.refreshData(), 500);
        } else {
          this.showToast(`Operation failed: ${result?.error || 'Unknown error'}`, 'error');
        }
      } catch (error) {
        console.error('[ACCOUNTS-UI] Form submission error:', error);
        this.showToast(`❌ Error: ${error.message}`, 'error');
      } finally {
        this.formSubmissionInProgress = false;
      }
    }

    getFormData(form) {
      const formData = new FormData(form);
      return {
        name: formData.get('name')?.trim(),
        email: formData.get('email')?.trim(),
        password: formData.get('password'),
        role: formData.get('role'),
        status: formData.get('status') || 'active',
      };
    }

    async createNewUser(userData) {
      console.log('[ACCOUNTS-UI] ✅ Creating new user');
      return await window.accountsManager.createUser(userData);
    }

    async updateExistingUser(userData) {
      console.log('[ACCOUNTS-UI] ✅ Updating existing user:', this.currentEditingUser.email);
      const updates = {
        name: userData.name,
        role: userData.role,
        status: userData.status,
        active: userData.status === 'active',
      };
      return await window.accountsManager.updateUser(this.currentEditingUser.email, updates);
    }

    setButtonLoading(button, isLoading, originalText = null) {
      if (!button) return;

      if (isLoading) {
        button.disabled = true;
        button.textContent = 'Processing...';
      } else {
        button.disabled = false;
        button.textContent = originalText || (this.isEditMode ? 'Update User' : 'Create User');
      }
    }

    // ========================================
    // TABLE MANAGEMENT
    // ========================================

    updateUserTable(users) {
      if (!users) users = window.accountsManager?.currentUsers || [];

      console.log('[ACCOUNTS-UI] Updating table with users:', users.length);

      this.filteredUsers = this.getFilteredUsers(users);
      const tbody = document.getElementById('usersTableBody');
      const loadingState = document.getElementById('tableLoadingState');
      const emptyState = document.getElementById('emptyState');

      if (!tbody) {
        console.warn('[ACCOUNTS-UI] Table body not found!');
        return;
      }

      if (loadingState) loadingState.style.display = 'none';

      if (this.filteredUsers.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                            No users match your current filters.
                        </td>
                    </tr>
                `;
        return;
      }

      if (emptyState) emptyState.style.display = 'none';
      tbody.innerHTML = this.filteredUsers.map(user => this.createUserRow(user)).join('');
      this.bindTableActionButtons();

      console.log('[ACCOUNTS-UI] Table updated with', this.filteredUsers.length, 'users');
    }

    createUserRow(user) {
      const isCurrentUser = user.email === window.accountsManager?.currentUserData?.email;
      const statusClass = user.active ? 'status-active' : 'status-disabled';
      const statusText = user.active ? 'Active' : 'Disabled';

      return `
                <tr class="table-row hover:bg-blue-50 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-10 w-10">
                                <div class="h-10 w-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold text-sm">
                                    ${user.name.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900 flex items-center">
                                    ${user.name}
                                    ${isCurrentUser ? '<span class="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">You</span>' : ''}
                                </div>
                                <div class="text-sm text-gray-500">${user.email}</div>
                                ${user.department ? `<div class="text-xs text-gray-400">${user.department}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="role-badge ${this.getRoleClass(user.role)}">
                            ${this.getRoleDisplayName(user.role)}
                        </span>
                        <div class="text-xs text-gray-500 mt-1">
                            ${this.getRolePermissions(user.role)}
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="role-badge ${statusClass}">
                            ${statusText}
                        </span>
                        <div class="text-xs text-gray-500 mt-1">
                            ${user.updatedAt ? `Updated: ${this.formatDate(user.updatedAt)}` : 'No updates'}
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>${this.formatDate(user.createdAt)}</div>
                        <div class="text-xs text-gray-400">
                            ${user.createdBy ? `by ${user.createdBy}` : ''}
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex space-x-2">
                        <button data-action="edit" data-email="${user.email}" 
                                class="text-blue-600 bg-blue-500/10 hover:text-white hover:bg-blue-600 p-1 rounded transition-colors duration-200"
                                title="Edit user">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5
                                    m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828
                                    l8.586-8.586z">
                                </path>
                            </svg>
                        </button>
                        ${this.createActionButton(user, isCurrentUser)}
                    </div>
                </td>

                </tr>
            `;
    }

    createActionButton(user, isCurrentUser) {
      if (user.active) {
        return `
                    <button data-action="delete" data-email="${user.email}" 
                            class="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''}"
                            title="${isCurrentUser ? 'Cannot delete your own account' : 'Deactivate user'}"
                            ${isCurrentUser ? 'disabled' : ''}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                `;
      } else {
        return `
                    <button data-action="reactivate" data-email="${user.email}" 
                            class="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                            title="Reactivate user">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </button>
                `;
      }
    }

    getFilteredUsers(users) {
      const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
      const roleFilter = document.getElementById('roleFilter')?.value || '';
      const statusFilter = document.getElementById('statusFilter')?.value || '';

      return users.filter(user => {
        const matchesSearch =
          !searchTerm ||
          user.name.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          this.getRoleDisplayName(user.role).toLowerCase().includes(searchTerm);

        const matchesRole = !roleFilter || user.role === roleFilter;
        const matchesStatus =
          !statusFilter ||
          (statusFilter === 'active' && user.active) ||
          (statusFilter === 'inactive' && !user.active);

        return matchesSearch && matchesRole && matchesStatus;
      });
    }

    updateStats(users) {
      if (!users) users = window.accountsManager?.currentUsers || [];

      console.log('[ACCOUNTS-UI] Updating stats with users:', users.length);

      const stats = {
        totalUsersCount: users.length,
        activeUsersCount: users.filter(u => u.active).length,
        adminUsersCount: users.filter(u => u.role === 'FULL_ACCESS_EDIT').length,
        pendingUsersCount: users.filter(u => u.status === 'pending').length,
      };

      Object.entries(stats).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
      });
    }

    filterUsers() {
      this.updateUserTable();
    }

    // ========================================
    // MODAL MANAGEMENT
    // ========================================

    openCreateModal() {
      console.log('[ACCOUNTS-UI] Opening create modal');

      this.resetModalState();
      this.setModalContent('Create New User', 'Create User', false);
      this.showModal();
      this.setDefaultRole();
      this.updatePermissionDisplay();
    }

    editUser(email) {
      console.log('[ACCOUNTS-UI] Editing user:', email);

      const user = window.accountsManager?.getUserByEmail(email);
      if (!user) {
        this.showToast('❌ User not found', 'error');
        return;
      }

      this.setEditMode(user);
      this.setModalContent(`Edit User: ${user.name}`, 'Update User', true);
      this.populateForm(user);
      this.showModal();
      this.updatePermissionDisplay();
    }

    closeModal() {
      console.log('[ACCOUNTS-UI] Closing modal');

      const modal = document.getElementById('userModal');
      if (modal) modal.classList.add('hidden');
      const backgroundBlur = document.getElementById('backgroundblur');
      if (backgroundBlur) backgroundBlur.classList.add('hidden');

      this.resetModalState();
      this.resetFormFields();
    }

    resetModalState() {
      this.isEditMode = false;
      this.currentEditingUser = null;
      this.formSubmissionInProgress = false;
    }

    setEditMode(user) {
      this.isEditMode = true;
      this.currentEditingUser = user;
    }

    setModalContent(title, submitText, isEdit) {
      const modalTitle = document.getElementById('modalTitle');
      const submitButtonText = document.getElementById('submitButtonText');
      const passwordField = document.getElementById('passwordField');
      const passwordInput = document.getElementById('userPassword');
      const emailInput = document.getElementById('userEmail');

      if (modalTitle) modalTitle.textContent = title;
      if (submitButtonText) submitButtonText.textContent = submitText;
      if (passwordField) passwordField.style.display = isEdit ? 'none' : 'block';
      if (passwordInput) passwordInput.required = !isEdit;
      if (emailInput) emailInput.readOnly = isEdit;
    }

    populateForm(user) {
      const fields = {
        userName: user.name || '',
        userEmail: user.email || '',
        userRole: user.role || '',
        userStatus: user.status || (user.active ? 'active' : 'disabled'),
      };

      Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.value = value;
      });
    }

    showModal() {
      const modal = document.getElementById('userModal');
      if (modal) modal.classList.remove('hidden');
      const backgroundBlur = document.getElementById('backgroundblur');
      if (backgroundBlur) backgroundBlur.classList.remove('hidden');
    }

    setDefaultRole() {
      const roleSelect = document.getElementById('userRole');
      if (roleSelect) roleSelect.value = 'LIMITED_ACCESS_VIEW';
    }

    resetFormFields() {
      const userForm = document.getElementById('userForm');
      const emailInput = document.getElementById('userEmail');
      const passwordInput = document.getElementById('userPassword');

      if (userForm) userForm.reset();
      if (emailInput) emailInput.readOnly = false;
      if (passwordInput) passwordInput.required = true;
    }

    // ========================================
    // USER ACTIONS
    // ========================================

    async deleteUser(email) {
      const user = window.accountsManager?.getUserByEmail(email);
      if (!user) {
        this.showToast('❌ User not found', 'error');
        return;
      }

      const isCurrentUser = email === window.accountsManager?.currentUserData?.email;
      if (isCurrentUser) {
        this.showToast('❌ You cannot delete your own account', 'error');
        return;
      }

      const message = `Are you sure you want to deactivate ${user.name}?\n\nThis will:\n- Disable their access to the system\n- Keep their data for audit purposes\n- Allow reactivation later if needed`;

      if (confirm(message)) {
        const result = await window.accountsManager?.deleteUser(email);
        if (result?.success) {
          setTimeout(() => this.refreshData(), 500);
        }
      }
    }

    async reactivateUser(email) {
      const user = window.accountsManager?.getUserByEmail(email);
      if (!user) {
        this.showToast('❌ User not found', 'error');
        return;
      }

      const message = `Reactivate ${user.name}'s account?\n\nThis will restore their access to the system.`;

      if (confirm(message)) {
        const result = await window.accountsManager?.reactivateUser(email);
        if (result?.success) {
          setTimeout(() => this.refreshData(), 500);
        }
      }
    }

    // ========================================
    // PERMISSIONS & DISPLAY
    // ========================================

    updatePermissionDisplay() {
      const role = document.getElementById('userRole')?.value;
      const permissionDiv = document.getElementById('permissionDisplay');

      if (!permissionDiv) return;

      const permissions = this.getPermissionConfig();
      const perm = permissions[role];

      if (perm) {
        permissionDiv.innerHTML = `
                    <div class="font-medium text-gray-800 mb-2">${perm.icon} ${perm.title}</div>
                    ${perm.details.map(detail => `<div class="text-xs mb-1">${detail}</div>`).join('')}
                `;
      } else {
        permissionDiv.innerHTML =
          '<div class="text-gray-500">Select a role to see permissions</div>';
      }
    }

    getPermissionConfig() {
      return {
        FULL_ACCESS_EDIT: {
          icon: '👑',
          title: 'Administrator (Full Access + Edit)',
          details: [
            '✅ Access to ALL pages including central.html',
            '✅ Full edit permissions on all pages',
            '✅ Access to account management',
            '✅ Can create/edit/delete users',
          ],
        },
        FULL_ACCESS_VIEW: {
          icon: '📊',
          title: 'Manager (Full Access - Read Only)',
          details: [
            '✅ Access to ALL pages including central.html',
            '❌ Read-only access (no editing)',
            '❌ Cannot access account management',
            '❌ Cannot modify user accounts',
          ],
        },
        LIMITED_ACCESS_EDIT: {
          icon: '🔧',
          title: 'Operator (Limited Access + Edit)',
          details: [
            '❌ No access to central.html or accounts.html',
            '✅ Access to other pages (main, dashboard, houses, events)',
            '✅ Edit permissions on accessible pages',
            '❌ Cannot access account management',
          ],
        },
        LIMITED_ACCESS_VIEW: {
          icon: '👁️',
          title: 'Viewer (Limited Access - Read Only)',
          details: [
            '❌ No access to central.html or accounts.html',
            '✅ Access to other pages (main, dashboard, houses, events)',
            '❌ Read-only access (no editing)',
            '❌ Cannot access account management',
          ],
        },
      };
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    getRoleClass(role) {
      const classes = {
        FULL_ACCESS_EDIT: 'role-FULL_ACCESS_EDIT',
        FULL_ACCESS_VIEW: 'role-FULL_ACCESS_VIEW',
        LIMITED_ACCESS_EDIT: 'role-LIMITED_ACCESS_EDIT',
        LIMITED_ACCESS_VIEW: 'role-LIMITED_ACCESS_VIEW',
      };
      return classes[role] || '';
    }

    getRoleDisplayName(role) {
      const roleNames = {
        FULL_ACCESS_EDIT: '👑 Administrator',
        FULL_ACCESS_VIEW: '📊 Manager',
        LIMITED_ACCESS_EDIT: '🔧 Operator',
        LIMITED_ACCESS_VIEW: '👁️ Viewer',
      };
      return roleNames[role] || role;
    }

    getRolePermissions(role) {
      const permissions = {
        FULL_ACCESS_EDIT: 'All pages • Edit access • Account management',
        FULL_ACCESS_VIEW: 'All pages • Read only',
        LIMITED_ACCESS_EDIT: 'Limited pages • Edit access • No central/accounts',
        LIMITED_ACCESS_VIEW: 'Limited pages • Read only • No central/accounts',
      };
      return permissions[role] || 'Unknown permissions';
    }

    formatDate(dateInput) {
      if (!dateInput) return 'N/A';

      let date;
      if (dateInput.toDate && typeof dateInput.toDate === 'function') {
        date = dateInput.toDate();
      } else if (typeof dateInput === 'string' || dateInput instanceof Date) {
        date = new Date(dateInput);
      } else {
        return 'Invalid date';
      }

      if (isNaN(date.getTime())) return 'Invalid date';

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }

    showToast(message, type = 'info') {
      const toastContainer = document.getElementById('toastContainer');
      if (!toastContainer) {
        console.log(`[ACCOUNTS-UI] Toast (no container): ${message}`);
        return;
      }

      const toast = this.createToastElement(message, type);
      toastContainer.appendChild(toast);

      // Animate in
      setTimeout(() => toast.classList.remove('translate-x-full'), 100);

      // Remove after 5 seconds
      setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 300);
      }, 5000);
    }

    createToastElement(message, type) {
      const toast = document.createElement('div');
      const config = this.getToastConfig(type);

      toast.className = `${config.bg} text-white px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full flex items-center space-x-2`;
      toast.innerHTML = `
                <span>${config.icon}</span>
                <span>${message}</span>
            `;

      return toast;
    }

    getToastConfig(type) {
      const configs = {
        success: { bg: 'bg-green-500', icon: '✅' },
        error: { bg: 'bg-red-500', icon: '❌' },
        info: { bg: 'bg-blue-500', icon: 'ℹ️' },
        warning: { bg: 'bg-yellow-500', icon: '⚠️' },
      };
      return configs[type] || configs.info;
    }
  }

  // Initialize and expose globally
  window.accountsUI = new AccountsUI();

  // Add CSS for logout modal animations
  const logoutStyles = document.createElement('style');
  logoutStyles.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .animate-spin {
            animation: spin 1s linear infinite;
        }
        
        /* Logout modal specific animations */
        #logoutModal {
            backdrop-filter: blur(4px);
        }
        
        #logoutModal .bg-white {
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        
        #logoutModal button:hover {
            transform: translateY(-1px);
        }
        
        #logoutModal .bg-gradient-to-r:hover {
            background-size: 110% 110%;
        }
    `;
  document.head.appendChild(logoutStyles);
})();
