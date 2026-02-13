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
        deleteUserBtn: () => {
             if (this.currentEditingUser) this.performHardDelete(this.currentEditingUser.email);
        },
      };

      Object.entries(buttons).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) element.addEventListener('click', handler);
      });
    }

    // ... (keep form events same)

    // ...

    async initializeSampleAccounts() {
      await this.showConfirmationModal({
          title: 'Initialize Sample Accounts?',
          message: 'This will create 8 sample user accounts for testing purposes.\n\n(Existing accounts with the same email will be skipped).',
          confirmText: 'Create Accounts',
          confirmColor: 'blue',
          iconStr: `<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>`,
          onConfirm: async () => {
              const result = await window.accountsManager?.initializeSampleAccounts();
              if (result?.success) setTimeout(() => this.refreshData(), 1000);
          }
      });
    }

    // ...

    setModalContent(title, submitText, isEdit) {
      const modalTitle = document.getElementById('modalTitle');
      const submitButtonText = document.getElementById('submitButtonText');
      const passwordField = document.getElementById('passwordField');
      const passwordInput = document.getElementById('userPassword');
      const emailInput = document.getElementById('userEmail');
      const deleteBtn = document.getElementById('deleteUserBtn');

      if (modalTitle) modalTitle.textContent = title;
      if (submitButtonText) submitButtonText.textContent = submitText;
      if (passwordField) passwordField.style.display = isEdit ? 'none' : 'block';
      if (passwordInput) passwordInput.required = !isEdit;
      if (emailInput) emailInput.readOnly = isEdit;
      
      // Update Delete Button visibility
      if (deleteBtn) {
          if (isEdit) {
              deleteBtn.classList.remove('hidden');
          } else {
              deleteBtn.classList.add('hidden');
          }
      }
    }

    bindFormEvents() {
      const userForm = document.getElementById('userForm');
      if (userForm) {
        userForm.addEventListener('submit', e => this.handleFormSubmit(e));
        console.log('[ACCOUNTS-UI] [SUCCESS] Form submit handler bound');
      }

      // Role listener removed
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

    // ========================================
    // CONFIRMATION MODALS (Generic)
    // ========================================

    async showConfirmationModal({ title, message, iconStr, confirmText, confirmColor, onConfirm }) {
      // Remove existing
      const existing = document.getElementById('confirmationModal');
      if (existing) existing.remove();

      const colorClass = confirmColor || 'red';
      const icon = iconStr || `
        <svg class="w-6 h-6 text-${colorClass}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
      `;

      const modalHTML = `
        <div id="confirmationModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] opacity-0 transition-opacity duration-300 px-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-xl w-full transform scale-95 transition-transform duration-300">
                <div class="p-6">
                    <div class="flex items-start">
                        <div class="flex-shrink-0 bg-${colorClass}-100 rounded-full p-2 mr-3">
                            ${icon}
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-gray-900 mb-2">${title}</h3>
                            <div class="text-gray-600 text-sm whitespace-pre-line">${message}</div>
                        </div>
                    </div>
                </div>
                <div class="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end space-x-3">
                    <button id="confirmCancelBtn" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium">
                        Cancel
                    </button>
                    <button id="confirmActionBtn" class="px-4 py-2 bg-${colorClass}-600 text-white rounded-lg hover:bg-${colorClass}-700 font-medium shadow-md flex items-center">
                        ${confirmText}
                    </button>
                </div>
            </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHTML);

      const modal = document.getElementById('confirmationModal');
      const confirmBtn = document.getElementById('confirmActionBtn');
      const cancelBtn = document.getElementById('confirmCancelBtn');

      // Animation in
      requestAnimationFrame(() => {
          modal.classList.remove('opacity-0');
          modal.querySelector('.transform').classList.remove('scale-95');
          modal.querySelector('.transform').classList.add('scale-100');
      });

      const close = () => {
          modal.classList.add('opacity-0');
          modal.querySelector('.transform').classList.remove('scale-100');
          modal.querySelector('.transform').classList.add('scale-95');
          setTimeout(() => modal.remove(), 300);
      };

      return new Promise((resolve) => {
          confirmBtn.onclick = async () => {
              // Loading state
              confirmBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Processing...
              `;
              confirmBtn.disabled = true;
              cancelBtn.disabled = true;
              
              if (onConfirm) await onConfirm();
              close();
              resolve(true);
          };
          cancelBtn.onclick = () => {
              close();
              resolve(false);
          };
      });
    }

    // Reuse customized logic for specific actions
    async handleLogout() {
        this.showConfirmationModal({
            title: 'Confirm Logout',
            message: 'Are you sure you want to sign out? Any unsaved changes will be lost.',
            confirmText: 'Sign Out',
            confirmColor: 'red',
            iconStr: `
                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>`,
            onConfirm: async () => {
                // Perform Logout Logic
                if (window.firebaseAuth) await window.firebaseAuth.signOut();
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = 'index.html';
            }
        });
    }

    // [User Request] Restored Deactivation/Reactivation toggle
    async deleteUser(email) {
        return this.performDeactivation(email);
    }

    async reactivateUser(email) {
        return this.performReactivation(email);
    }

    async performDeactivation(email) {
        const user = window.accountsManager?.getUserByEmail(email);
        if (!user) return;

        await this.showConfirmationModal({
            title: `Deactivate ${user.name}?`,
            message: `This will suspend the user's access to the system.\n\nThey will not be able to log in until reactivated, but their account data will be preserved.`,
            confirmText: 'Deactivate User',
            confirmColor: 'orange',
            iconStr: `<svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>`,
            onConfirm: async () => {
                const result = await window.accountsManager?.deleteUser(email); // Manager's deleteUser is actually deactivation
                if (result?.success) setTimeout(() => this.refreshData(), 500);
            }
        });
    }

    async performReactivation(email) {
        const user = window.accountsManager?.getUserByEmail(email);
        if (!user) return;

        await this.showConfirmationModal({
            title: `Reactivate ${user.name}?`,
            message: `This will restore the user's access to the system immediately.`,
            confirmText: 'Reactivate User',
            confirmColor: 'green',
            iconStr: `<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
            onConfirm: async () => {
                const result = await window.accountsManager?.reactivateUser(email);
                if (result?.success) setTimeout(() => this.refreshData(), 500);
            }
        } );
    }

    // Hard Delete Implementation (triggered from Edit Modal usually)
    async performHardDelete(email) {
        const user = window.accountsManager?.getUserByEmail(email);
        if (!user) return;

        // Double confirmation for hard delete
        await this.showConfirmationModal({
            title: `PERMANENTLY Delete ${user.name}?`,
            message: `⚠️ <b>WARNING: This action cannot be undone.</b>\n\nThis will permanently remove the user profile and all associated permissions from Firestore.\n\n(Note: If the user exists in Firebase Auth, they will be orphaned effectively disabled).`,
            confirmText: 'Delete Permanently',
            confirmColor: 'red',
            onConfirm: async () => {
                const result = await window.accountsManager?.permanentlyDeleteUser(email);
                if (result?.success) {
                    this.closeModal(); // Close the edit modal if open
                    setTimeout(() => this.refreshData(), 500);
                }
            }
        });
    }

    // ========================================
    // PERMISSIONS & DISPLAY
    // ========================================

    testFirebaseConnection() {
      console.log('[ACCOUNTS-UI] Testing Firebase connection...');

      if (window.accountsManager?.testFirebaseConnection) {
        window.accountsManager.testFirebaseConnection();
      } else {
        this.showToast('[FIRE] Firebase appears to be working! (Basic test)', 'success');
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
      await this.showConfirmationModal({
        title: 'Initialize Sample Data?',
        message: 'This will create 8 sample user accounts for testing purposes.\n\nProceeding will populate the system with administrative and standard user roles for verification.',
        confirmText: 'Create Accounts',
        confirmColor: 'blue',
        iconStr: `<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>`,
        onConfirm: async () => {
          const result = await window.accountsManager?.initializeSampleAccounts();
          if (result?.success) {
            setTimeout(() => this.refreshData(), 1000);
          }
        }
      });
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
          console.log('[ACCOUNTS-UI] [SUCCESS] Form submission successful');
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
      const data = {
        name: formData.get('name')?.trim(),
        email: formData.get('email')?.trim(),
        password: formData.get('password'),
        role: formData.get('role'),
        status: formData.get('status') || 'active',
        permissions: {}
      };

      // [OVERHAUL] Collect granular permissions from radios
      const pages = this.getPageKeys();
      pages.forEach(page => {
        const value = form.querySelector(`input[name="perm_${page}"]:checked`)?.value || 'none';
        data.permissions[page] = value;
      });

      return data;
    }

    async createNewUser(userData) {
      console.log('[ACCOUNTS-UI] [SUCCESS] Creating new user');
      return await window.accountsManager.createUser(userData);
    }

    async updateExistingUser(userData) {
      console.log('[ACCOUNTS-UI] [SUCCESS] Updating existing user:', this.currentEditingUser.email);
      const updates = {
        name: userData.name,
        role: userData.role,
        permissions: userData.permissions, // [OVERHAUL] Include permissions
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
      // [User Request] Restore Deactivation/Reactivation toggle with improved icons
      const isActive = user.active;
      
      if (isActive) {
          // Show Deactivate (Shield / Ban icon)
          return `
                <button data-action="delete" data-email="${user.email}" 
                        class="text-orange-600 hover:text-orange-900 p-1.5 rounded-lg hover:bg-orange-50 transition-all duration-200 ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''}"
                        title="${isCurrentUser ? 'Cannot modify your own account' : 'Deactivate User'}"
                        ${isCurrentUser ? 'disabled' : ''}>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                    </svg>
                </button>
            `;
      } else {
          // Show Reactivate (Check icon)
          return `
                <button data-action="reactivate" data-email="${user.email}" 
                        class="text-green-600 hover:text-green-900 p-1.5 rounded-lg hover:bg-green-50 transition-all duration-200"
                        title="Reactivate User">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        // userRole removed
        userStatus: user.status || (user.active ? 'active' : 'disabled'),
      };

      Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.value = value;
      });

      // [OVERHAUL] Populate granular permissions
      // Fix: Merge with defaults to prevent partial/undefined permission errors
      // Note: migrateLegacyRole now handles undefined role gracefully
      const defaultPerms = window.accountsManager.migrateLegacyRole(user.role);
      const savedPerms = user.permissions || {};
      const finalPerms = { ...defaultPerms, ...savedPerms };
      
      this.updatePermissionDisplay(finalPerms);
    }

    showModal() {
      const modal = document.getElementById('userModal');
      if (modal) modal.classList.remove('hidden');
      const backgroundBlur = document.getElementById('backgroundblur');
      if (backgroundBlur) backgroundBlur.classList.remove('hidden');
    }

    setDefaultRole() {
      // Deprecated
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


    // ========================================
    // PERMISSIONS & DISPLAY
    // ========================================

    getPageKeys() {
        return ['dashboard', 'central', 'aquila', 'cetus', 'cygnus', 'ursa', 'events', 'accounts'];
    }

    getPageDisplayName(key) {
        const names = {
            dashboard: 'Dashboard',
            central: 'Central Panel',
            aquila: 'Aquila House',
            cetus: 'Cetus House',
            cygnus: 'Cygnus House',
            ursa: 'Ursa House',
            events: 'Events Calendar',
            accounts: 'Account Management'
        };
        return names[key] || key.charAt(0).toUpperCase() + key.slice(1);
    }

    updatePermissionDisplay(customPermissions = null) {
      const role = document.getElementById('userRole')?.value;
      const tableBody = document.getElementById('permissionsTableBody');

      if (!tableBody) return;

      const basePermissions = customPermissions || window.accountsManager.migrateLegacyRole(role);
      const pages = this.getPageKeys();

      tableBody.innerHTML = pages.map(page => {
          const currentLevel = basePermissions[page] || 'none';
          const displayName = this.getPageDisplayName(page);
          
          return `
            <tr class="hover:bg-blue-50/50 transition-colors">
              <td class="px-4 py-3 font-medium text-gray-700">${displayName}</td>
              <td class="px-2 py-3 text-center">
                <input type="radio" name="perm_${page}" value="none" class="form-radio text-red-500" ${currentLevel === 'none' ? 'checked' : ''}>
              </td>
              <td class="px-2 py-3 text-center">
                <input type="radio" name="perm_${page}" value="view" class="form-radio text-blue-500" ${currentLevel === 'view' ? 'checked' : ''}>
              </td>
              <td class="px-2 py-3 text-center">
                <input type="radio" name="perm_${page}" value="edit" class="form-radio text-green-500" ${currentLevel === 'edit' ? 'checked' : ''}>
              </td>
            </tr>
          `;
      }).join('');
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

  if (window.accountsUI) {
    console.log('[ACCOUNTS-UI] Already initialized.');
    return;
  }
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
