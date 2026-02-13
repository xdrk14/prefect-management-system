// Account Audit Log System
// File: public/scripts/accounts-audit.js
(function () {
  'use strict';

  class AccountsAudit {
    constructor() {
      this.auditLogs = [];
      this.isLoading = false;
      this.init();
    }

    init() {
      console.log('[ACCOUNTS-AUDIT] Initializing audit system...');
      this.waitForFirebase();
    }

    waitForFirebase() {
      if (window.firebaseDb) {
        this.setupRealtimeListener();
        this.loadAuditSection();
      } else {
        setTimeout(() => this.waitForFirebase(), 100);
      }
    }

    setupRealtimeListener() {
      // Listen for real-time updates to audit log
      window.firebaseDb
        .collection('accountAuditLog')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .onSnapshot(
          snapshot => {
            this.handleAuditUpdate(snapshot);
          },
          error => {
            console.error('[ACCOUNTS-AUDIT] Real-time listener error:', error);
          }
        );
    }

    handleAuditUpdate(snapshot) {
      this.auditLogs = [];
      snapshot.forEach(doc => {
        this.auditLogs.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      this.updateAuditDisplay();
    }

    loadAuditSection() {
      // Add audit log section to the page if it doesn't exist
      const mainContent = document.querySelector('main');
      if (!mainContent || document.getElementById('auditLogSection')) return;

      const auditSection = document.createElement('div');
      auditSection.id = 'auditLogSection';
      auditSection.className = 'mt-8';
      auditSection.innerHTML = this.createAuditSectionHTML();

      mainContent.appendChild(auditSection);
    }

    createAuditSectionHTML() {
      return `
                <!-- Audit Log Section -->
                <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div class="bg-gradient-to-r from-indigo-600 to-purple-700 p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-2xl font-bold text-white flex items-center">
                                    <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    Account Activity Log
                                </h3>
                                <p class="text-indigo-100 mt-1">Real-time tracking of all account management activities</p>
                            </div>
                            <div class="flex space-x-2">
                                <button onclick="accountsAudit.refreshAuditLog()" 
                                        class="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors flex items-center">
                                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                    </svg>
                                    Refresh
                                </button>
                                <button onclick="accountsAudit.exportAuditLog()" 
                                        class="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors flex items-center">
                                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
                                    </svg>
                                    Export
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Filter Controls -->
                    <div class="border-b border-gray-200 p-4 bg-gray-50">
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Filter by Action</label>
                                <select id="auditActionFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm">
                                    <option value="">All Actions</option>
                                    <option value="CREATE">Create User</option>
                                    <option value="UPDATE">Update User</option>
                                    <option value="DELETE">Delete User</option>
                                    <option value="REACTIVATE">Reactivate User</option>
                                    <option value="BULK_CREATE">Bulk Operations</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Performed By</label>
                                <input type="text" id="auditUserFilter" placeholder="Filter by user email..." 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Target User</label>
                                <input type="text" id="auditTargetFilter" placeholder="Filter by target user..." 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
                                <select id="auditTimeFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm">
                                    <option value="">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Audit Log Timeline -->
                    <div class="p-6">
                        <div id="auditLogContainer" class="space-y-4">
                            <!-- Audit entries will be populated here -->
                        </div>
                        
                        <!-- Loading State -->
                        <div id="auditLoadingState" class="text-center py-8">
                            <div class="inline-flex items-center text-gray-500">
                                <svg class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Loading audit log...
                            </div>
                        </div>
                        
                        <!-- Empty State -->
                        <div id="auditEmptyState" class="text-center py-12 hidden">
                            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <h3 class="mt-2 text-sm font-medium text-gray-900">No audit entries found</h3>
                            <p class="mt-1 text-sm text-gray-500">Account activities will appear here when they occur.</p>
                        </div>
                    </div>
                </div>
            `;
    }

    updateAuditDisplay() {
      const container = document.getElementById('auditLogContainer');
      const loadingState = document.getElementById('auditLoadingState');
      const emptyState = document.getElementById('auditEmptyState');

      if (!container) return;

      // Hide loading state
      if (loadingState) loadingState.style.display = 'none';

      const filteredLogs = this.getFilteredAuditLogs();

      if (filteredLogs.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        container.innerHTML = '';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      container.innerHTML = filteredLogs.map(log => this.createAuditEntry(log)).join('');

      // Setup filter event listeners if not already done
      this.setupFilterListeners();
    }

    setupFilterListeners() {
      if (this.filtersSetup) return;
      this.filtersSetup = true;

      const actionFilter = document.getElementById('auditActionFilter');
      const userFilter = document.getElementById('auditUserFilter');
      const targetFilter = document.getElementById('auditTargetFilter');
      const timeFilter = document.getElementById('auditTimeFilter');

      if (actionFilter) actionFilter.addEventListener('change', () => this.updateAuditDisplay());
      if (userFilter) userFilter.addEventListener('input', () => this.updateAuditDisplay());
      if (targetFilter) targetFilter.addEventListener('input', () => this.updateAuditDisplay());
      if (timeFilter) timeFilter.addEventListener('change', () => this.updateAuditDisplay());
    }

    getFilteredAuditLogs() {
      const actionFilter = document.getElementById('auditActionFilter')?.value || '';
      const userFilter = (document.getElementById('auditUserFilter')?.value || '').toLowerCase();
      const targetFilter = (
        document.getElementById('auditTargetFilter')?.value || ''
      ).toLowerCase();
      const timeFilter = document.getElementById('auditTimeFilter')?.value || '';

      return this.auditLogs.filter(log => {
        // Action filter
        const matchesAction = !actionFilter || log.action === actionFilter;

        // User filter
        const matchesUser =
          !userFilter || (log.performedBy && log.performedBy.toLowerCase().includes(userFilter));

        // Target filter
        const matchesTarget =
          !targetFilter || (log.targetUser && log.targetUser.toLowerCase().includes(targetFilter));

        // Time filter
        let matchesTime = true;
        if (timeFilter && log.timestamp) {
          const logDate = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
          const now = new Date();

          switch (timeFilter) {
            case 'today':
              matchesTime = logDate.toDateString() === now.toDateString();
              break;
            case 'week':
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              matchesTime = logDate >= weekAgo;
              break;
            case 'month':
              const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              matchesTime = logDate >= monthAgo;
              break;
          }
        }

        return matchesAction && matchesUser && matchesTarget && matchesTime;
      });
    }

    createAuditEntry(log) {
      const actionIcons = {
        CREATE: { icon: '➕', color: 'text-green-600', bg: 'bg-green-100' },
        UPDATE: { icon: '✏️', color: 'text-blue-600', bg: 'bg-blue-100' },
        DELETE: { icon: '🗑️', color: 'text-red-600', bg: 'bg-red-100' },
        REACTIVATE: { icon: '🔄', color: 'text-green-600', bg: 'bg-green-100' },
        BULK_CREATE: { icon: '📦', color: 'text-purple-600', bg: 'bg-purple-100' },
      };

      const actionStyle = actionIcons[log.action] || {
        icon: '📝',
        color: 'text-gray-600',
        bg: 'bg-gray-100',
      };
      const timestamp = this.formatTimestamp(log.timestamp);

      return `
                <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div class="flex items-start space-x-4">
                        <div class="flex-shrink-0">
                            <div class="w-10 h-10 rounded-full ${actionStyle.bg} flex items-center justify-center">
                                <span class="text-lg">${actionStyle.icon}</span>
                            </div>
                        </div>
                        
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-gray-900">
                                        ${log.description || this.getDefaultDescription(log)}
                                    </p>
                                    <div class="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                                        <span>👤 ${log.performedBy || 'System'}</span>
                                        ${log.targetUser ? `<span>🎯 ${log.targetUser}</span>` : ''}
                                        <span>🕐 ${timestamp}</span>
                                    </div>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${actionStyle.bg} ${actionStyle.color}">
                                        ${log.action}
                                    </span>
                                    ${
                                      this.hasChanges(log)
                                        ? `
                                        <button onclick="accountsAudit.toggleDetails('${log.id}')" 
                                                class="text-blue-600 hover:text-blue-800 text-xs underline">
                                            Details
                                        </button>
                                    `
                                        : ''
                                    }
                                </div>
                            </div>
                            
                            <!-- Expandable Details -->
                            <div id="details-${log.id}" class="hidden mt-3 p-3 bg-gray-50 rounded-lg">
                                ${this.createChangeDetails(log)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
    }

    hasChanges(log) {
      return log.changes && (log.changes.old || log.changes.new);
    }

    createChangeDetails(log) {
      if (!this.hasChanges(log)) {
        return '<p class="text-sm text-gray-500">No detailed changes available.</p>';
      }

      const { old: oldData, new: newData } = log.changes;
      let details = '';

      if (log.action === 'UPDATE' && oldData && newData) {
        details = '<div class="text-sm"><strong>Changes made:</strong></div>';
        details += '<div class="mt-2 space-y-1 text-xs">';

        // Compare old and new data
        const fields = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
        fields.forEach(field => {
          if (field === 'updatedAt' || field === 'updatedBy') return; // Skip meta fields

          const oldValue = oldData?.[field];
          const newValue = newData?.[field];

          if (oldValue !== newValue) {
            details += `
                            <div class="flex justify-between">
                                <span class="font-medium">${this.formatFieldName(field)}:</span>
                                <span>
                                    <span class="text-red-600 line-through">${this.formatValue(oldValue)}</span>
                                    →
                                    <span class="text-green-600">${this.formatValue(newValue)}</span>
                                </span>
                            </div>
                        `;
          }
        });
        details += '</div>';
      } else if (log.action === 'CREATE' && newData) {
        details = '<div class="text-sm"><strong>User created with:</strong></div>';
        details += '<div class="mt-2 space-y-1 text-xs">';
        Object.entries(newData).forEach(([key, value]) => {
          if (
            key !== 'createdAt' &&
            key !== 'createdBy' &&
            key !== 'updatedAt' &&
            key !== 'updatedBy'
          ) {
            details += `
                            <div class="flex justify-between">
                                <span class="font-medium">${this.formatFieldName(key)}:</span>
                                <span>${this.formatValue(value)}</span>
                            </div>
                        `;
          }
        });
        details += '</div>';
      }

      return details;
    }

    formatFieldName(field) {
      return field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }

    formatValue(value) {
      if (value === null || value === undefined) return 'Not set';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'object' && value.toDate) return this.formatTimestamp(value);
      return String(value);
    }

    getDefaultDescription(log) {
      const actionDescriptions = {
        CREATE: `Created user account for ${log.targetUser}`,
        UPDATE: `Updated user account for ${log.targetUser}`,
        DELETE: `Deactivated user account for ${log.targetUser}`,
        REACTIVATE: `Reactivated user account for ${log.targetUser}`,
        BULK_CREATE: `Bulk created ${log.changes?.new?.count || 'multiple'} user accounts`,
      };

      return actionDescriptions[log.action] || `${log.action} performed on ${log.targetUser}`;
    }

    formatTimestamp(timestamp) {
      if (!timestamp) return 'Unknown time';

      let date;
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        // Firebase Timestamp
        date = timestamp.toDate();
      } else {
        date = new Date(timestamp);
      }

      if (isNaN(date.getTime())) return 'Invalid date';

      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    toggleDetails(logId) {
      const detailsElement = document.getElementById(`details-${logId}`);
      if (detailsElement) {
        detailsElement.classList.toggle('hidden');
      }
    }

    async refreshAuditLog() {
      const result = await window.accountsManager?.getAuditLog();
      if (result?.success) {
        this.auditLogs = result.logs;
        this.updateAuditDisplay();
        this.showToast('Audit log refreshed', 'success');
      } else {
        this.showToast('Failed to refresh audit log', 'error');
      }
    }

    exportAuditLog() {
      if (this.auditLogs.length === 0) {
        this.showToast('No audit data to export', 'warning');
        return;
      }

      try {
        const filteredLogs = this.getFilteredAuditLogs();
        const csvData = this.convertToCSV(filteredLogs);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute(
            'download',
            `account_audit_log_${new Date().toISOString().split('T')[0]}.csv`
          );
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          this.showToast('Audit log exported successfully', 'success');
        } else {
          this.showToast('Export not supported in this browser', 'error');
        }
      } catch (error) {
        console.error('Export error:', error);
        this.showToast('Failed to export audit log', 'error');
      }
    }

    convertToCSV(logs) {
      const headers = [
        'Timestamp',
        'Action',
        'Performed By',
        'Target User',
        'Description',
        'Details',
      ];
      const csvRows = [headers.join(',')];

      logs.forEach(log => {
        const timestamp = this.formatTimestamp(log.timestamp);
        const details = this.hasChanges(log) ? this.extractChangesText(log) : '';

        const row = [
          `"${timestamp}"`,
          `"${log.action}"`,
          `"${log.performedBy || 'System'}"`,
          `"${log.targetUser || 'N/A'}"`,
          `"${log.description || this.getDefaultDescription(log)}"`,
          `"${details}"`,
        ];

        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');
    }

    extractChangesText(log) {
      if (!this.hasChanges(log)) return '';

      const { old: oldData, new: newData } = log.changes;
      const changes = [];

      if (log.action === 'UPDATE' && oldData && newData) {
        const fields = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
        fields.forEach(field => {
          if (field === 'updatedAt' || field === 'updatedBy') return;

          const oldValue = oldData?.[field];
          const newValue = newData?.[field];

          if (oldValue !== newValue) {
            changes.push(`${field}: ${oldValue} → ${newValue}`);
          }
        });
      }

      return changes.join('; ');
    }

    showToast(message, type = 'info') {
      // Dispatch custom event for UI to handle
      window.dispatchEvent(
        new CustomEvent('showToast', {
          detail: { message, type },
        })
      );
    }

    // Get audit statistics
    getAuditStats() {
      const stats = {
        total: this.auditLogs.length,
        byAction: {},
        byUser: {},
        recentActivity: 0,
      };

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      this.auditLogs.forEach(log => {
        // Count by action
        stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

        // Count by user
        const user = log.performedBy || 'System';
        stats.byUser[user] = (stats.byUser[user] || 0) + 1;

        // Count recent activity
        const logDate = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
        if (logDate >= oneDayAgo) {
          stats.recentActivity++;
        }
      });

      return stats;
    }

    // Add audit entry programmatically (for testing)
    async addTestAuditEntry() {
      const testEntry = {
        action: 'CREATE',
        targetUser: 'test@example.com',
        performedBy: window.accountsManager?.currentUserData?.email || 'test-user',
        timestamp: new Date(),
        description: 'Test audit entry created',
        changes: {
          old: null,
          new: {
            name: 'Test User',
            role: 'LIMITED_ACCESS_VIEW',
            active: true,
          },
        },
      };

      try {
        await window.firebaseDb.collection('accountAuditLog').add(testEntry);
        this.showToast('Test audit entry added', 'success');
      } catch (error) {
        console.error('Error adding test audit entry:', error);
        this.showToast('Failed to add test audit entry', 'error');
      }
    }
  }

  // Initialize and expose globally
  window.accountsAudit = new AccountsAudit();
})();
