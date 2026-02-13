// Enhanced Audit Log Management System - Safe for All Pages
class AuditLogManager {
  constructor() {
    this.db = null;
    this.auth = null;
    this.currentPage = 1;
    this.entriesPerPage = 25;
    this.totalEntries = 0;
    this.currentFilter = {
      activity: '',
      timeRange: '24h',
    };
    this.isListening = false;
    this.unsubscribeAuditLog = null;
    this.isAccountsPage = !!document.getElementById('auditLogTableBody'); // Check if on accounts page

    this.init();
  }

  async init() {
    try {
      // Wait for Firebase to be initialized
      if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded');
        return;
      }

      this.auth = firebase.auth();
      this.db = firebase.firestore();

      // Set up event listeners only if on accounts page
      if (this.isAccountsPage) {
        this.setupEventListeners();
        // Load initial audit log
        await this.loadAuditLog();
        // Start real-time listening
        this.startRealtimeListening();
      }

      console.log(
        '✅ Audit system initialized',
        this.isAccountsPage ? 'with UI' : 'background only'
      );
    } catch (error) {
      console.error('Error initializing audit log:', error);
      this.showError('Failed to initialize audit log system');
    }
  }

  setupEventListeners() {
    // Only set up listeners if elements exist
    document.getElementById('refreshAuditBtn')?.addEventListener('click', () => {
      this.loadAuditLog();
    });

    document.getElementById('clearAuditBtn')?.addEventListener('click', () => {
      this.showClearConfirmation();
    });

    document.getElementById('exportAuditBtn')?.addEventListener('click', () => {
      this.exportAuditLog();
    });

    document.getElementById('auditActivityFilter')?.addEventListener('change', e => {
      this.currentFilter.activity = e.target.value;
      this.currentPage = 1;
      this.loadAuditLog();
    });

    document.getElementById('auditTimeFilter')?.addEventListener('change', e => {
      this.currentFilter.timeRange = e.target.value;
      this.currentPage = 1;
      this.loadAuditLog();
    });

    document.getElementById('auditPrevPage')?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.loadAuditLog();
      }
    });

    document.getElementById('auditNextPage')?.addEventListener('click', () => {
      const maxPage = Math.ceil(this.totalEntries / this.entriesPerPage);
      if (this.currentPage < maxPage) {
        this.currentPage++;
        this.loadAuditLog();
      }
    });
  }

  startRealtimeListening() {
    if (this.isListening || !this.db || !this.isAccountsPage) return;

    try {
      let query = this.db.collection('auditLog').orderBy('timestamp', 'desc').limit(50);

      this.unsubscribeAuditLog = query.onSnapshot(
        snapshot => {
          if (!snapshot.metadata.hasPendingWrites) {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                this.handleNewAuditEntry(change.doc.data());
              }
            });

            this.updateAuditStatistics();
          }
        },
        error => {
          console.error('Error listening to audit log:', error);
        }
      );

      this.isListening = true;
    } catch (error) {
      console.error('Error setting up real-time listening:', error);
    }
  }

  handleNewAuditEntry(auditData) {
    if (!this.isAccountsPage) return;

    // REMOVED: Toast notification for new activities to reduce noise

    // Just refresh the whole table for new entries
    if (
      this.currentPage === 1 &&
      !this.currentFilter.activity &&
      this.currentFilter.timeRange === '24h'
    ) {
      // Reload the audit log to show new entries properly
      setTimeout(() => {
        this.loadAuditLog();
      }, 1000);
    }
  }

  async loadAuditLog() {
    if (!this.isAccountsPage) return;

    try {
      this.showAuditLoading(true);

      let query = this.db.collection('auditLog').orderBy('timestamp', 'desc');

      if (this.currentFilter.timeRange !== 'all') {
        const timeLimit = this.getTimeFilterDate();
        query = query.where('timestamp', '>=', timeLimit);
      }

      if (this.currentFilter.activity) {
        query = query.where('activity', '==', this.currentFilter.activity);
      }

      const countSnapshot = await query.get();
      this.totalEntries = countSnapshot.size;

      const offset = (this.currentPage - 1) * this.entriesPerPage;
      query = query.limit(this.entriesPerPage);

      if (offset > 0) {
        const offsetSnapshot = await this.db
          .collection('auditLog')
          .orderBy('timestamp', 'desc')
          .limit(offset)
          .get();

        if (!offsetSnapshot.empty) {
          const lastVisible = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
          query = query.startAfter(lastVisible);
        }
      }

      const snapshot = await query.get();
      const auditEntries = [];

      snapshot.forEach(doc => {
        auditEntries.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      this.displayAuditEntries(auditEntries);
      this.updatePagination();
      this.updateAuditStatistics();
    } catch (error) {
      console.error('Error loading audit log:', error);
      this.showError('Failed to load audit log');
    } finally {
      this.showAuditLoading(false);
    }
  }

  displayAuditEntries(entries) {
    const tableBody = document.getElementById('auditLogTableBody');
    const emptyState = document.getElementById('auditEmptyState');

    // Only proceed if audit table exists (for accounts.html)
    if (!tableBody) {
      return;
    }

    if (entries.length === 0) {
      tableBody.innerHTML = '';
      emptyState?.classList.remove('hidden');
      return;
    }

    emptyState?.classList.add('hidden');

    const html = entries.map(entry => this.createAuditEntryHTML(entry)).join('');
    tableBody.innerHTML = html;
  }

  createAuditEntryHTML(entry) {
    const timestamp = this.formatTimestamp(entry.timestamp);
    const activityBadge = this.getActivityBadge(entry.activity);
    const statusIcon = this.getStatusIcon(entry.status);

    const escapeHtml = text => {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    };

    const userName = escapeHtml(entry.userName || 'Unknown User');
    const userEmail = escapeHtml(entry.userEmail || 'No email');
    const details = escapeHtml(entry.details || 'No details available');
    const changes = entry.changes ? escapeHtml(entry.changes) : '';
    const ipAddress = escapeHtml(entry.ipAddress || 'Unknown');

    const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : '?';

    return `
            <tr class="table-row hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div class="flex flex-col">
                        <span class="font-medium">${timestamp.date}</span>
                        <span class="text-xs text-gray-500">${timestamp.time}</span>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-8 w-8">
                            <div class="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <span class="text-xs font-medium text-gray-600">${userInitial}</span>
                            </div>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm font-medium text-gray-900">${userName}</p>
                            <p class="text-xs text-gray-500">${userEmail}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${activityBadge}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    <div class="max-w-xs">
                        <p class="text-sm">${details}</p>
                        ${changes ? `<p class="text-xs text-gray-500 mt-1">${changes}</p>` : ''}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span class="font-mono text-xs">${ipAddress}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${statusIcon}
                </td>
            </tr>
        `;
  }

  getActivityBadge(activity) {
    const escapeHtml = text => {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    };

    const badges = {
      login: `<span class="role-badge role-FULL_ACCESS_VIEW">🔐 User Login</span>`,
      logout: `<span class="role-badge role-LIMITED_ACCESS_VIEW">🚪 User Logout</span>`,
      user_created: `<span class="role-badge role-FULL_ACCESS_EDIT">👤 User Created</span>`,
      user_updated: `<span class="role-badge role-LIMITED_ACCESS_EDIT">✏️ User Updated</span>`,
      user_deleted: `<span class="role-badge" style="background-color: #fee2e2; color: #dc2626;">🗑️ User Deleted</span>`,
      role_changed: `<span class="role-badge role-FULL_ACCESS_EDIT">👑 Role Changed</span>`,
      status_changed: `<span class="role-badge role-LIMITED_ACCESS_EDIT">🔄 Status Changed</span>`,
      password_reset: `<span class="role-badge" style="background-color: #fef3c7; color: #d97706;">🔑 Password Reset</span>`,
      data_export: `<span class="role-badge" style="background-color: #d1fae5; color: #059669;">📊 Data Export</span>`,
      system_error: `<span class="role-badge" style="background-color: #fee2e2; color: #dc2626;">⚠️ System Error</span>`,
      // Prefect-related activities
      prefect_created: `<span class="role-badge role-FULL_ACCESS_EDIT">👥 Prefect Added</span>`,
      prefect_updated: `<span class="role-badge role-LIMITED_ACCESS_EDIT">✏️ Prefect Updated</span>`,
      prefect_deleted: `<span class="role-badge" style="background-color: #fee2e2; color: #dc2626;">🗑️ Prefect Deleted</span>`,
      prefect_viewed: `<span class="role-badge role-LIMITED_ACCESS_VIEW">👀 Prefect Viewed</span>`,
      offense_added: `<span class="role-badge" style="background-color: #fef3c7; color: #d97706;">⚠️ Offense Added</span>`,
      // Event-related activities
      event_created: `<span class="role-badge role-FULL_ACCESS_EDIT">📅 Event Created</span>`,
      event_updated: `<span class="role-badge role-LIMITED_ACCESS_EDIT">📝 Event Updated</span>`,
      event_deleted: `<span class="role-badge" style="background-color: #fee2e2; color: #dc2626;">🗑️ Event Deleted</span>`,
      attendee_added: `<span class="role-badge" style="background-color: #d1fae5; color: #059669;">➕ Attendee Added</span>`,
      attendee_removed: `<span class="role-badge" style="background-color: #fef3c7; color: #d97706;">➖ Attendee Removed</span>`,
      // System activities
      bulk_import: `<span class="role-badge" style="background-color: #d1fae5; color: #059669;">📊 Bulk Import</span>`,
      data_backup: `<span class="role-badge" style="background-color: #e0e7ff; color: #3730a3;">💾 Data Backup</span>`,
      system_maintenance: `<span class="role-badge" style="background-color: #f3e8ff; color: #7c3aed;">🔧 System Maintenance</span>`,
      test_manual: `<span class="role-badge" style="background-color: #e0e7ff; color: #3730a3;">🧪 Manual Test</span>`,
      manual_test: `<span class="role-badge" style="background-color: #e0e7ff; color: #3730a3;">🧪 Test Entry</span>`,
    };

    return (
      badges[activity] ||
      `<span class="role-badge role-LIMITED_ACCESS_VIEW">${escapeHtml(activity)}</span>`
    );
  }

  getStatusIcon(status) {
    const icons = {
      success: `<span class="status-active">✅ Success</span>`,
      failure: `<span class="status-disabled">❌ Failed</span>`,
      warning: `<span class="status-pending">⚠️ Warning</span>`,
      info: `<span class="status-active">ℹ️ Info</span>`,
    };

    return icons[status] || `<span class="status-pending">${status || 'Unknown'}</span>`;
  }

  // REMOVED: prependAuditEntry method to fix display issues
  // Real-time updates now use full table refresh instead

  formatTimestamp(timestamp) {
    let date;

    if (timestamp && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      date = new Date();
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    let dateStr;
    if (diffHours < 24) {
      dateStr = 'Today';
    } else if (diffHours < 48) {
      dateStr = 'Yesterday';
    } else {
      dateStr = date.toLocaleDateString();
    }

    const timeStr = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return { date: dateStr, time: timeStr };
  }

  getTimeFilterDate() {
    const now = new Date();
    switch (this.currentFilter.timeRange) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0);
    }
  }

  async updateAuditStatistics() {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const totalEventsSnapshot = await this.db
        .collection('auditLog')
        .where('timestamp', '>=', thirtyDaysAgo)
        .get();

      const todayLoginsSnapshot = await this.db
        .collection('auditLog')
        .where('activity', '==', 'login')
        .where('timestamp', '>=', todayStart)
        .get();

      const userChangesSnapshot = await this.db
        .collection('auditLog')
        .where('activity', 'in', [
          'user_created',
          'user_updated',
          'user_deleted',
          'prefect_created',
          'prefect_updated',
          'prefect_deleted',
        ])
        .where('timestamp', '>=', thirtyDaysAgo)
        .get();

      const roleChangesSnapshot = await this.db
        .collection('auditLog')
        .where('activity', '==', 'role_changed')
        .where('timestamp', '>=', thirtyDaysAgo)
        .get();

      const errorsSnapshot = await this.db
        .collection('auditLog')
        .where('activity', '==', 'system_error')
        .where('timestamp', '>=', thirtyDaysAgo)
        .get();

      // Only update UI elements if they exist (for accounts.html)
      const totalAuditEventsEl = document.getElementById('totalAuditEvents');
      const todayLoginsEl = document.getElementById('todayLogins');
      const totalUserChangesEl = document.getElementById('totalUserChanges');
      const totalRoleChangesEl = document.getElementById('totalRoleChanges');
      const totalErrorsEl = document.getElementById('totalErrors');

      if (totalAuditEventsEl) totalAuditEventsEl.textContent = totalEventsSnapshot.size;
      if (todayLoginsEl) todayLoginsEl.textContent = todayLoginsSnapshot.size;
      if (totalUserChangesEl) totalUserChangesEl.textContent = userChangesSnapshot.size;
      if (totalRoleChangesEl) totalRoleChangesEl.textContent = roleChangesSnapshot.size;
      if (totalErrorsEl) totalErrorsEl.textContent = errorsSnapshot.size;
    } catch (error) {
      console.error('Error updating audit statistics:', error);
    }
  }

  updatePagination() {
    const maxPage = Math.ceil(this.totalEntries / this.entriesPerPage);

    // Only update UI elements if they exist (for accounts.html)
    const currentEntriesEl = document.getElementById('auditCurrentEntries');
    const totalEntriesEl = document.getElementById('auditTotalEntries');
    const pageInfoEl = document.getElementById('auditPageInfo');
    const prevBtn = document.getElementById('auditPrevPage');
    const nextBtn = document.getElementById('auditNextPage');

    if (currentEntriesEl) {
      currentEntriesEl.textContent = Math.min(this.entriesPerPage, this.totalEntries);
    }

    if (totalEntriesEl) {
      totalEntriesEl.textContent = `(Total: ${this.totalEntries})`;
    }

    if (pageInfoEl) {
      pageInfoEl.textContent = `Page ${this.currentPage} of ${maxPage}`;
    }

    if (prevBtn) {
      prevBtn.disabled = this.currentPage <= 1;
    }

    if (nextBtn) {
      nextBtn.disabled = this.currentPage >= maxPage;
    }
  }

  showAuditLoading(show) {
    const loadingState = document.getElementById('auditLoadingState');
    const tableBody = document.getElementById('auditLogTableBody');

    // Only update if elements exist (for accounts.html)
    if (show) {
      loadingState?.classList.remove('hidden');
      if (tableBody) tableBody.innerHTML = '';
    } else {
      loadingState?.classList.add('hidden');
    }
  }

  showClearConfirmation() {
    if (
      confirm(
        'Are you sure you want to clear old audit log entries? This will remove entries older than 90 days and cannot be undone.'
      )
    ) {
      this.clearOldLogs();
    }
  }

  async clearOldLogs() {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const oldLogsSnapshot = await this.db
        .collection('auditLog')
        .where('timestamp', '<', ninetyDaysAgo)
        .get();

      const batch = this.db.batch();
      let deletedCount = 0;

      oldLogsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      if (deletedCount > 0) {
        await batch.commit();
        this.showToast(`Successfully deleted ${deletedCount} old audit log entries`, 'success');
        await this.logActivity('system_maintenance', 'Audit log cleanup completed', {
          deletedEntries: deletedCount,
          cutoffDate: ninetyDaysAgo.toISOString(),
        });
        this.loadAuditLog();
      } else {
        this.showToast('No old entries found to delete', 'info');
      }
    } catch (error) {
      console.error('Error clearing old logs:', error);
      this.showError('Failed to clear old audit log entries');
    }
  }

  async exportAuditLog() {
    try {
      this.showToast('Preparing audit log export...', 'info');

      let query = this.db.collection('auditLog').orderBy('timestamp', 'desc');

      if (this.currentFilter.timeRange !== 'all') {
        const timeLimit = this.getTimeFilterDate();
        query = query.where('timestamp', '>=', timeLimit);
      }

      if (this.currentFilter.activity) {
        query = query.where('activity', '==', this.currentFilter.activity);
      }

      const snapshot = await query.get();
      const auditData = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        auditData.push({
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
          userEmail: data.userEmail,
          userName: data.userName,
          activity: data.activity,
          details: data.details,
          changes: data.changes,
          ipAddress: data.ipAddress,
          status: data.status,
          userAgent: data.userAgent,
        });
      });

      this.downloadCSV(auditData, `audit-log-export-${new Date().toISOString().split('T')[0]}.csv`);

      await this.logActivity('data_export', 'Audit log exported', {
        exportedEntries: auditData.length,
        filters: this.currentFilter,
      });
    } catch (error) {
      console.error('Error exporting audit log:', error);
      this.showError('Failed to export audit log');
    }
  }

  downloadCSV(data, filename) {
    if (data.length === 0) {
      this.showToast('No data to export', 'warning');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers
          .map(header => {
            const value = row[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.showToast(`Audit log exported as ${filename}`, 'success');
    }
  }

  // MAIN LOGGING FUNCTION - call this from other parts of your application
  async logActivity(activity, details, additionalData = {}) {
    try {
      if (!this.auth || !this.db) {
        console.log('🔍 Audit system not ready:', { auth: !!this.auth, db: !!this.db });
        return;
      }

      const currentUser = this.auth.currentUser;
      const timestamp = firebase.firestore.FieldValue.serverTimestamp();

      let userEmail = 'system';
      let userName = 'System';

      if (currentUser) {
        userEmail = currentUser.email;

        try {
          const userRoleDoc = await this.db.collection('userRoles').doc(userEmail).get();
          if (userRoleDoc.exists) {
            userName =
              userRoleDoc.data().name || currentUser.displayName || userEmail.split('@')[0];
          }
        } catch (error) {
          console.warn('Could not fetch user name:', error);
          userName = currentUser.displayName || userEmail.split('@')[0];
        }
      }

      const ipAddress = 'Not tracked';

      const auditEntry = {
        timestamp,
        userEmail,
        userName,
        activity,
        details,
        ipAddress,
        userAgent: navigator.userAgent,
        status: additionalData.status || 'success',
        changes: additionalData.changes || null,
        targetUser: additionalData.targetUser || null,
        oldValues: additionalData.oldValues || null,
        newValues: additionalData.newValues || null,
        ...additionalData,
      };

      console.log('🔍 Logging audit activity:', { activity, details, userEmail });

      await this.db.collection('auditLog').add(auditEntry);

      console.log('✅ Audit entry logged successfully');
    } catch (error) {
      console.error('❌ Error logging activity:', error);
      // Don't throw error to avoid breaking the main functionality
    }
  }

  showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
      console.log('📢 Toast (no container):', message);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification animate-fadeIn ${type}`;

    const bgColor =
      {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500',
      }[type] || 'bg-gray-500';

    toast.innerHTML = `
            <div class="flex items-center p-4 mb-4 text-white rounded-lg shadow-lg ${bgColor}">
                <div class="ml-3 text-sm font-medium">${message}</div>
                <button type="button" class="ml-auto bg-transparent text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
                    <span class="sr-only">Close</span>
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 5000);
  }

  showError(message) {
    this.showToast(message, 'error');
  }

  // Helper methods for other parts of your application to log specific activities
  async logUserLogin(userEmail, userName, loginStatus = 'success') {
    await this.logActivity('login', `User logged in`, {
      status: loginStatus,
      targetUser: userEmail,
    });
  }

  async logUserLogout(userEmail, userName) {
    await this.logActivity('logout', `User logged out`, {
      targetUser: userEmail,
    });
  }

  async logUserCreated(newUserData, createdBy) {
    await this.logActivity('user_created', `New user account created: ${newUserData.email}`, {
      targetUser: newUserData.email,
      newValues: {
        name: newUserData.name,
        email: newUserData.email,
        role: newUserData.role,
        status: newUserData.status,
      },
      createdBy,
    });
  }

  async logUserUpdated(userEmail, oldValues, newValues, updatedBy) {
    const changes = this.getChangeSummary(oldValues, newValues);
    await this.logActivity('user_updated', `User account updated: ${userEmail}`, {
      targetUser: userEmail,
      oldValues,
      newValues,
      changes,
      updatedBy,
    });
  }

  async logUserDeleted(deletedUserData, deletedBy) {
    await this.logActivity('user_deleted', `User account deleted: ${deletedUserData.email}`, {
      targetUser: deletedUserData.email,
      oldValues: deletedUserData,
      deletedBy,
    });
  }

  async logRoleChanged(userEmail, oldRole, newRole, changedBy) {
    await this.logActivity('role_changed', `User role changed: ${userEmail}`, {
      targetUser: userEmail,
      changes: `Role changed from "${oldRole}" to "${newRole}"`,
      oldValues: { role: oldRole },
      newValues: { role: newRole },
      changedBy,
    });
  }

  async logStatusChanged(userEmail, oldStatus, newStatus, changedBy) {
    await this.logActivity('status_changed', `User status changed: ${userEmail}`, {
      targetUser: userEmail,
      changes: `Status changed from "${oldStatus}" to "${newStatus}"`,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      changedBy,
    });
  }

  async logPasswordReset(userEmail, resetBy) {
    await this.logActivity('password_reset', `Password reset initiated for: ${userEmail}`, {
      targetUser: userEmail,
      resetBy,
    });
  }

  async logSystemError(errorMessage, errorData = {}) {
    await this.logActivity('system_error', errorMessage, {
      status: 'failure',
      errorData,
    });
  }

  getChangeSummary(oldValues, newValues) {
    const changes = [];

    for (const key in newValues) {
      if (oldValues[key] !== newValues[key]) {
        changes.push(`${key}: "${oldValues[key]}" → "${newValues[key]}"`);
      }
    }

    return changes.join(', ');
  }

  destroy() {
    if (this.unsubscribeAuditLog) {
      this.unsubscribeAuditLog();
      this.unsubscribeAuditLog = null;
    }
    this.isListening = false;
  }
}

// Global instance
let auditLogManager = null;

// Initialize audit log when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for Firebase to initialize
  setTimeout(() => {
    auditLogManager = new AuditLogManager();
  }, 1000);
});

// Make audit log methods globally available
window.auditLog = {
  logUserLogin: (email, name, status) => auditLogManager?.logUserLogin(email, name, status),
  logUserLogout: (email, name) => auditLogManager?.logUserLogout(email, name),
  logUserCreated: (userData, createdBy) => auditLogManager?.logUserCreated(userData, createdBy),
  logUserUpdated: (email, oldValues, newValues, updatedBy) =>
    auditLogManager?.logUserUpdated(email, oldValues, newValues, updatedBy),
  logUserDeleted: (userData, deletedBy) => auditLogManager?.logUserDeleted(userData, deletedBy),
  logRoleChanged: (email, oldRole, newRole, changedBy) =>
    auditLogManager?.logRoleChanged(email, oldRole, newRole, changedBy),
  logStatusChanged: (email, oldStatus, newStatus, changedBy) =>
    auditLogManager?.logStatusChanged(email, oldStatus, newStatus, changedBy),
  logPasswordReset: (email, resetBy) => auditLogManager?.logPasswordReset(email, resetBy),
  logSystemError: (message, errorData) => auditLogManager?.logSystemError(message, errorData),
  logActivity: (activity, details, additionalData) =>
    auditLogManager?.logActivity(activity, details, additionalData),
};

console.log('✅ Safe Audit Log Manager loaded successfully!');
console.log(
  '🔍 Page detection:',
  document.getElementById('auditLogTableBody')
    ? 'Accounts page with UI'
    : 'House page - background only'
);
