// [LAUNCH] ULTRA-FAST Edit Manager - Complete Rewrite with Instant Loading & Optimized Deletion
// This guard clause checks if the script has already been run.
if (typeof window.editManagerInitialized === 'undefined') {
  window.editManagerInitialized = true;

  /**
   * [LAUNCH] SECURE Authentication Helper Functions (Secure-First Approach) - OPTIMIZED
   */

  // [STRICT] STRICT permission check - denies access until permissions are explicitly verified.
  function hasEditPermission() {
    // [STRICT] Method 1: Check authSystem (most reliable source of truth)
    if (window.authSystem && window.authSystem.userRole) {
      const userRole = window.authSystem.userRole;
      const hasEdit = userRole.includes('EDIT');
      console.log('[STRICT-EDIT] authSystem role check:', userRole, 'has EDIT:', hasEdit);
      return hasEdit;
    }

    // [STRICT] Method 2: Check Firebase + cached role for quick access
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
      const user = firebase.auth().currentUser;
      const cachedRole = localStorage.getItem(`userRole_${user.email}`);
      if (cachedRole) {
        const hasEdit = cachedRole.includes('EDIT');
        console.log('[STRICT-EDIT] Cached role check:', cachedRole, 'has EDIT:', hasEdit);
        return hasEdit;
      }

      // If logged in but no cache, DENY access until the main auth system loads.
      console.log(
        '[STRICT-EDIT] User logged in but no role cached. Access denied until auth system loads.'
      );
      return false;
    }

    // [STRICT] DEFAULT TO FALSE - No permission if not logged in or auth not ready.
    console.log('[STRICT-EDIT] No valid authentication found. Access denied.');
    return false;
  }

  // [LAUNCH] INSTANT auth check - MUCH faster version
  function checkAuthInstant(callback) {
    // Immediate check - most cases will pass here
    if (window.authSystem && window.authSystem.userRole) {
      console.log('[EDIT-MANAGER] Instant auth available - immediate execution');
      callback();
      return;
    }

    // Quick Firebase + cache check
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
      const user = firebase.auth().currentUser;
      const cachedRole = localStorage.getItem(`userRole_${user.email}`);
      if (cachedRole && cachedRole.includes('EDIT')) {
        console.log('[EDIT-MANAGER] Cached Firebase auth available - immediate execution');
        callback();
        return;
      }
    }

    // Only wait if absolutely necessary (rare case)
    console.log('[EDIT-MANAGER] Auth not immediately available, quick wait...');
    let attempts = 0;
    const quickCheck = () => {
      attempts++;
      if ((window.authSystem && window.authSystem.userRole) || attempts >= 3) {
        callback();
      } else {
        setTimeout(quickCheck, 100); // Reduced from 200ms to 100ms, max 3 attempts (300ms total)
      }
    };
    quickCheck();
  }

  // [STRICT] INSTANT permission check for UI rendering - OPTIMIZED
  function checkEditPermissionInstant() {
    // [STRICT] Method 1: Check if authSystem is loaded and has EDIT role.
    if (window.authSystem && window.authSystem.userRole) {
      const hasEdit = window.authSystem.userRole.includes('EDIT');
      console.log(
        '[STRICT-AUTH] authSystem check - has EDIT:',
        hasEdit,
        'role:',
        window.authSystem.userRole
      );
      return hasEdit;
    }

    // [STRICT] Method 2: Check Firebase + cached role. This provides the instant load speed.
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
      const user = firebase.auth().currentUser;
      const cachedRole = localStorage.getItem(`userRole_${user.email}`);

      if (cachedRole) {
        const hasEdit = cachedRole.includes('EDIT');
        console.log('[STRICT-AUTH] Cached role check - has EDIT:', hasEdit);
        return hasEdit;
      }
    }

    // [STRICT] HIDE the button if not ready (faster than logging)
    return false;
  }

  /**
   * [LAUNCH] INSTANT Edit Manager Extension for PrefectTableManager - OPTIMIZED
   */

  // Store reference to original methods BEFORE overriding them
  const originalInit = PrefectTableManager.prototype.init;

  // Extend the PrefectTableManager class with edit functionality
  Object.assign(PrefectTableManager.prototype, {
    // [STRICT] ULTRA-FAST edit manager initialization - instant buttons, minimal polling
    initEditManager() {
      console.log('[EDIT-MANAGER] Initializing with Ultra-Fast security.');

      this.createEditModal();
      this.bindEditEvents();
      this.editEnabled = false; // Assume no access by default.

      // React to explicit auth-ready events to avoid polling delays
      try {
        window.addEventListener('auth:ready', e => {
          const role = e && e.detail && e.detail.userRole;
          const hasEdit = !!(role && role.includes && role.includes('EDIT'));
          console.log('[EDIT-MANAGER] auth:ready received. hasEdit:', hasEdit);
          if (hasEdit !== this.editEnabled) {
            this.editEnabled = hasEdit;
            this.refreshData();
          }
        });
      } catch (err) {
        console.warn('[EDIT-MANAGER] Failed to bind auth:ready listener', err);
      }

      // --- Phase 1: INSTANT UI update from cache ---
      if (this.checkEditPermissionInstant()) {
        console.log('[EDIT-MANAGER] CACHE HIT: "EDIT" role found. Showing buttons immediately.');
        this.editEnabled = true;
        this.refreshData(); // Re-render the UI to make buttons appear now.
      }

      // --- Phase 2: MUCH FASTER background verification ---
      let authCheckCompleted = false;
      let attempts = 0;
      const maxAttempts = 50; // Reduced from 200 to 50 (~2.5 seconds timeout)

      const verifyLiveAuth = () => {
        if (authCheckCompleted) return;
        attempts++;

        if (window.authSystem && window.authSystem.userRole) {
          authCheckCompleted = true; // Stop polling.
          const hasLiveEdit = window.authSystem.userRole.includes('EDIT');

          console.log(`[EDIT-MANAGER] Live auth loaded. Has EDIT: ${hasLiveEdit}.`);

          // SECURITY: If live permission is different from what the cache showed, fix the UI.
          if (hasLiveEdit !== this.editEnabled) {
            console.warn('[SECURITY] Permission mismatch! Correcting UI based on live data.');
            this.editEnabled = hasLiveEdit;
            this.refreshData(); // Re-render to either hide or show buttons.
          }

          // Update the cache with the latest role.
          if (firebase.auth && firebase.auth().currentUser) {
            const user = firebase.auth().currentUser;
            localStorage.setItem(`userRole_${user.email}`, window.authSystem.userRole);
          }
        } else if (attempts < maxAttempts) {
          setTimeout(verifyLiveAuth, 50); // Same 50ms polling but fewer attempts
        } else {
          console.log('[EDIT-MANAGER] Live auth check timed out (faster timeout).');
        }
      };

      // Start the live verification immediately in the background.
      setTimeout(verifyLiveAuth, 0);
    },

    // [LAUNCH] OPTIMIZED Load events in background - with better error handling
    loadEventsInBackground() {
      console.log('[EDIT-MANAGER] Loading events in background...');

      // Use Promise.allSettled for better error handling and faster response
      Promise.allSettled([fetch('/api/general-events'), fetch('/api/house-events')])
        .then(async results => {
          const [generalResult, houseResult] = results;

          if (generalResult.status === 'fulfilled' && generalResult.value.ok) {
            this.generalEvents = await generalResult.value.json();
          } else {
            this.generalEvents = [];
            console.log('[EDIT-MANAGER] [WARNING] Failed to load general events');
          }

          if (houseResult.status === 'fulfilled' && houseResult.value.ok) {
            this.houseEvents = await houseResult.value.json();
          } else {
            this.houseEvents = [];
            console.log('[EDIT-MANAGER] [WARNING] Failed to load house events');
          }

          console.log(
            '[EDIT-MANAGER] [SUCCESS] Events loaded:',
            this.generalEvents.length,
            'general,',
            this.houseEvents.length,
            'house'
          );
        })
        .catch(error => {
          console.log('[EDIT-MANAGER] [WARNING] Error loading events in background:', error);
          this.generalEvents = [];
          this.houseEvents = [];
        });
    },

    // Check if editing is enabled for this user
    isEditingEnabled() {
      return hasEditPermission(); // Use the strict check
    },

    // Show message when user doesn't have edit permissions
    showNoEditPermissionMessage() {
      const notification = document.createElement('div');
      notification.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 10000;
                background: #fef3c7; color: #92400e; padding: 12px 20px;
                border-radius: 8px; font-family: Arial, sans-serif; font-size: 14px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #fbbf24;
                transform: translateX(100%); transition: transform 0.3s ease;
            `;

      notification.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <span style="margin-right: 8px;">[STRICT]</span>
                    <span><strong>Access Denied:</strong> You need edit permissions to modify prefect data</span>
                </div>
            `;

      document.body.appendChild(notification);

      // Animate in
      setTimeout(() => {
        notification.style.transform = 'translateX(0)';
      }, 10);

      // Auto-remove after 4 seconds
      setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
      }, 4000);
    },

    // Create the edit modal HTML structure
    createEditModal() {
      const editModalHTML = `
                <div id="editPrefectModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center p-4">
                    <div class="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto">
                        <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
                            <h2 id="editModalTitle" class="text-2xl font-bold text-gray-900">Edit Prefect</h2>
                            <div class="flex space-x-2">
                                <button id="saveChangesBtn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors duration-200">
                                    Save Changes
                                </button>
                                <button onclick="prefectManager.closeEditModal()" class="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div id="editModalContent" class="p-6">
                        </div>
                    </div>
                </div>
            `;
      document.body.insertAdjacentHTML('beforeend', editModalHTML);
    },

    // Bind edit-related events
    bindEditEvents() {
      const saveBtn = document.getElementById('saveChangesBtn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveAllChanges());
      }

      // Handle escape key
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          const modal = document.getElementById('editPrefectModal');
          if (modal && !modal.classList.contains('hidden')) {
            this.closeEditModal();
          }
        }
      });
    },

    // [LAUNCH] ULTRA-FAST Show edit modal - instant auth check, minimal verification
    async showEditModal(prefectId) {
      console.log('[EDIT-MANAGER] Edit modal requested for prefect:', prefectId);

      // [STRICT] INSTANT SECURITY CHECK - Block if no permission (no waiting)
      if (!hasEditPermission()) {
        console.log('[SECURITY] Edit access denied - insufficient permissions');
        this.showNoEditPermissionMessage();
        return;
      }

      const modal = document.getElementById('editPrefectModal');
      const modalTitle = document.getElementById('editModalTitle');
      const modalContent = document.getElementById('editModalContent');

      // Show modal immediately with loading state
      modalTitle.textContent = 'Loading...';
      modalContent.innerHTML =
        '<div class="text-center py-8"><div class="loading-spinner mx-auto"></div><p class="mt-2">Loading prefect data...</p></div>';
      modal.classList.remove('hidden');

      try {
        // Load data immediately - skip extra auth verification for speed
        const url = `/api/edit/prefects/${this.house}/${prefectId}`;
        console.log(`[EDIT-MANAGER] Fetching prefect data from: ${url}`);

        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(
            errorData.error ||
              `Failed to load prefect data: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        // Final quick auth check before showing edit form
        if (!hasEditPermission()) {
          console.log('[SECURITY] Final auth check failed - access denied');
          modalContent.innerHTML =
            '<div class="text-center py-8 text-red-600"><h3 class="text-xl font-bold mb-2">Access Denied</h3><p>You need edit permissions to modify prefect data.</p></div>';
          return;
        }

        this.currentEditData = data;
        this.currentEditId = prefectId;

        // Generate temporary IDs for offenses
        this.offenseMap = new Map();
        data.offenses.forEach((offense, index) => {
          const tempId = `offense_${Date.now()}_${index}`;
          this.offenseMap.set(tempId, {
            ...offense,
            originalIndex: index,
          });
        });

        modalTitle.textContent = `Edit ${data.prefect.FullName}`;
        modalContent.innerHTML = this.generateEditForm(data);

        this.initFormHandlers();
      } catch (error) {
        console.error('[EDIT-MANAGER] Error loading prefect for edit:', error);
        modalContent.innerHTML = `<div class="text-center py-8 text-red-600"><h3 class="text-xl font-bold mb-2">Error</h3><p>${error.message}</p><button onclick="prefectManager.closeEditModal()" class="mt-4 bg-gray-500 text-white px-4 py-2 rounded">Close</button></div>`;
      }
    },

    // Generate the edit form HTML
    generateEditForm(data) {
      const { prefect, offenses, events } = data;

      return `
                <div class="bg-blue-50 rounded-lg p-6 mb-6 border border-blue-200">
                    <h3 class="text-xl font-bold mb-4 text-gray-900 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        Personal Information
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Prefect ID</label>
                            <input type="text" id="editPrefectID" value="${prefect.PrefectID}" 
                                   class="w-full p-3 border border-gray-300 rounded-lg bg-gray-100" readonly>
                            <p class="text-xs text-gray-500 mt-1">Cannot be changed</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">W0 Number *</label>
                            <input type="text" id="editW0Number" value="${prefect.W0Number || ''}" 
                                   class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                            <input type="text" id="editFullName" value="${prefect.FullName || ''}" 
                                   class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                            <select id="editPosition" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                                ${this.getPositionOptions(prefect.Position)}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                            <input type="date" id="editDateOfBirth" value="${prefect.DateOfBirth || ''}" 
                                   class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                            <input type="text" id="editClass" value="${prefect.Class || ''}" 
                                   placeholder="e.g., 11 Sci A" 
                                   class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                            <p class="text-xs text-gray-500 mt-1">Format: Grade Subject Section (e.g., "11 Sci A")</p>
                        </div>
                    </div>
                    
                    <div class="mt-6 flex justify-end space-x-3">
                        <button onclick="prefectManager.deletePrefectFast('${prefect.PrefectID}')" 
                                class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors duration-200">
                            Delete Prefect
                        </button>
                    </div>
                </div>

                <div class="bg-red-50 rounded-lg p-6 mb-6 border border-red-200">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold text-gray-900 flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                            </svg>
                            Offenses (${offenses.length})
                        </h3>
                        <button onclick="prefectManager.showAddOffenseForm()" 
                                class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded transition-colors duration-200">
                            Add Offense
                        </button>
                    </div>
                    
                    <div id="addOffenseForm" class="hidden mb-4 p-4 bg-white rounded-lg border border-gray-300">
                        <h4 class="font-semibold mb-3">Add New Offense</h4>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Offense Description</label>
                                <input type="text" id="newOffenseDesc" placeholder="e.g., Late for assembly" 
                                       class="w-full p-2 border border-gray-300 rounded">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Points Deducted</label>
                                <input type="number" id="newOffensePoints" placeholder="5" min="1" max="50"
                                       class="w-full p-2 border border-gray-300 rounded">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input type="date" id="newOffenseDate" value="${new Date().toISOString().split('T')[0]}"
                                       class="w-full p-2 border border-gray-300 rounded">
                            </div>
                        </div>
                        <div class="mt-3 flex space-x-2">
                            <button onclick="prefectManager.addOffense()" 
                                    class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
                                Add Offense
                            </button>
                            <button onclick="prefectManager.hideAddOffenseForm()" 
                                    class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
                                Cancel
                            </button>
                        </div>
                    </div>
                    
                    <div id="offensesList">
                        ${this.generateOffensesList(offenses)}
                    </div>
                </div>

                <div class="bg-green-50 rounded-lg p-6 border border-green-200">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold text-gray-900 flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            Event Participation (${events.length})
                        </h3>
                        <button onclick="prefectManager.showAddEventForm()" 
                                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors duration-200">
                            Add Event
                        </button>
                    </div>
                    
                    <div id="addEventForm" class="hidden mb-4 p-4 bg-white rounded-lg border border-gray-300">
                        <h4 class="font-semibold mb-3">Add Event Participation</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">General Events</label>
                                <select id="newGeneralEvent" class="w-full p-2 border border-gray-300 rounded">
                                    <option value="">Select General Event...</option>
                                    ${this.getEventOptions('general')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">House Events</label>
                                <select id="newHouseEvent" class="w-full p-2 border border-gray-300 rounded">
                                    <option value="">Select House Event...</option>
                                    ${this.getEventOptions('house')}
                                </select>
                            </div>
                        </div>
                        <p class="text-sm text-gray-600 mt-2">Select either a General Event or House Event (not both)</p>
                        <div class="mt-3 flex space-x-2">
                            <button onclick="prefectManager.addEvent()" 
                                    class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
                                Add Event
                            </button>
                            <button onclick="prefectManager.hideAddEventForm()" 
                                    class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
                                Cancel
                            </button>
                        </div>
                    </div>
                    
                    <div id="eventsList">
                        ${this.generateEventsList(events)}
                    </div>
                </div>
            `;
    },

    // Generate position options for select dropdown
    getPositionOptions(currentPosition) {
      const positions =
        this.house === 'Central'
          ? ['Head Prefect', 'Deputy Head Prefect', 'Games Captain', 'Deputy Games Captain']
          : [
              'House Captain',
              'Deputy House Captain',
              'House Games Captain',
              'Deputy House Games Captain',
              'Prefects',
              'House Prefects',
              'Prefect Interns',
            ];

      return positions
        .map(
          pos =>
            `<option value="${pos}" ${pos === currentPosition ? 'selected' : ''}>${pos}</option>`
        )
        .join('');
    },

    // Generate event options for select dropdowns
    getEventOptions(type) {
      const events = type === 'general' ? this.generalEvents : this.houseEvents;
      const idField = type === 'general' ? 'GeneralEventID' : 'HouseEventID';
      const nameField = type === 'general' ? 'GeneralEventName' : 'HouseEventName';
      const dateField = 'EventDateHeld';

      if (!events || events.length === 0) {
        return '<option value="">No events available</option>';
      }

      return events
        .map(
          event =>
            `<option value="${event[idField]}">${event[nameField]} (${this.formatDate(event[dateField])})</option>`
        )
        .join('');
    },

    // Generate offenses list HTML
    generateOffensesList(offenses) {
      if (offenses.length === 0) {
        return '<div class="text-center py-4 text-gray-500">No offenses recorded</div>';
      }

      const offenseIds = Array.from(this.offenseMap.keys());

      return `
                <div class="space-y-2">
                    ${offenses
                      .map((offense, index) => {
                        const tempId = offenseIds[index];
                        return `
                            <div class="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                <div class="flex-1">
                                    <h5 class="font-medium text-gray-900">${offense.Offense}</h5>
                                    <p class="text-sm text-gray-600">${this.formatDate(offense.Date)} • ${offense.PointsDeducted} points deducted</p>
                                </div>
                                <button onclick="prefectManager.removeOffense('${tempId}')" 
                                        class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">
                                    Remove
                                </button>
                            </div>
                        `;
                      })
                      .join('')}
                </div>
            `;
    },

    // Generate events list HTML
    generateEventsList(events) {
      if (events.length === 0) {
        return '<div class="text-center py-4 text-gray-500">No events participated</div>';
      }

      return `
                <div class="space-y-2">
                    ${events
                      .map(event => {
                        const isGeneral = event.GeneralEventID;
                        const eventName = isGeneral ? event.GeneralEventName : event.HouseEventName;
                        const eventDate = isGeneral ? event.GeneralDate : event.HouseDate;
                        const eventType = isGeneral ? 'general' : 'house';
                        const eventId = isGeneral ? event.GeneralEventID : event.HouseEventsID;

                        return `
                            <div class="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                <div class="flex-1">
                                    <h5 class="font-medium text-gray-900">${eventName || 'Unknown Event'}</h5>
                                    <p class="text-sm text-gray-600">
                                        ${this.formatDate(eventDate)} • 
                                        <span class="capitalize ${isGeneral ? 'text-blue-600' : 'text-green-600'}">${eventType} Event</span>
                                    </p>
                                </div>
                                <button onclick="prefectManager.removeEvent('${eventType}', '${eventId}')" 
                                        class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">
                                    Remove
                                </button>
                            </div>
                        `;
                      })
                      .join('')}
                </div>
            `;
    },

    // Initialize form handlers
    initFormHandlers() {
      const w0NumberInput = document.getElementById('editW0Number');
      const classInput = document.getElementById('editClass');

      if (w0NumberInput) {
        w0NumberInput.addEventListener('input', this.validateW0Number.bind(this));
      }
      if (classInput) {
        classInput.addEventListener('input', this.validateClass.bind(this));
      }
    },

    // Validate W0Number format
    validateW0Number(event) {
      const value = event.target.value;
      const pattern = /^W\d{5}$/;

      if (value && !pattern.test(value)) {
        event.target.classList.add('border-red-500');
        this.showValidationError(event.target, 'W0Number must be in format W00000');
      } else {
        event.target.classList.remove('border-red-500');
        this.hideValidationError(event.target);
      }
    },

    // Validate Class format
    validateClass(event) {
      const value = event.target.value;
      const pattern = /^\d{1,2}\s+\w+\s+\w+$/;

      if (value && !pattern.test(value)) {
        event.target.classList.add('border-red-500');
        this.showValidationError(event.target, '');
      } else {
        event.target.classList.remove('border-red-500');
        this.hideValidationError(event.target);
      }
    },

    // Show validation error
    showValidationError(element, message) {
      let errorDiv = element.parentNode.querySelector('.validation-error');
      if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error text-red-500 text-xs mt-1';
        element.parentNode.appendChild(errorDiv);
      }
      errorDiv.textContent = message;
    },

    // Hide validation error
    hideValidationError(element) {
      const errorDiv = element.parentNode.querySelector('.validation-error');
      if (errorDiv) {
        errorDiv.remove();
      }
    },

    // [LAUNCH] ULTRA-FAST confirmation dialog - uses native browser confirm()
    showConfirmationFast(message, onConfirm) {
      if (confirm(message)) {
        onConfirm(true);
      } else {
        onConfirm(false);
      }
    },

    // [LAUNCH] ULTRA-FAST prompt dialog - uses native browser prompt()
    showPromptFast(message, onConfirm) {
      const result = prompt(message);
      onConfirm(result);
    },

    // Show confirmation dialog (custom modal version)
    showConfirmation(message, onConfirm) {
      const modalHTML = `
                <div id="confirmationModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
                    <div class="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full">
                        <p class="text-lg font-semibold mb-4">${message}</p>
                        <div class="flex justify-end space-x-3">
                            <button id="confirmCancelBtn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">Cancel</button>
                            <button id="confirmOkBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">OK</button>
                        </div>
                    </div>
                </div>
            `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);

      const modal = document.getElementById('confirmationModal');
      document.getElementById('confirmOkBtn').onclick = () => {
        onConfirm(true);
        modal.remove();
      };
      document.getElementById('confirmCancelBtn').onclick = () => {
        onConfirm(false);
        modal.remove();
      };
    },

    // Show prompt dialog (custom modal version)
    showPrompt(message, onConfirm) {
      const modalHTML = `
                <div id="promptModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
                    <div class="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full">
                        <p class="text-lg font-semibold mb-4">${message}</p>
                        <input type="text" id="promptInput" class="w-full p-2 border border-gray-300 rounded mb-4" />
                        <div class="flex justify-end space-x-3">
                            <button id="promptCancelBtn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">Cancel</button>
                            <button id="promptOkBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">OK</button>
                        </div>
                    </div>
                </div>
            `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);

      const modal = document.getElementById('promptModal');
      const input = document.getElementById('promptInput');
      document.getElementById('promptOkBtn').onclick = () => {
        onConfirm(input.value);
        modal.remove();
      };
      document.getElementById('promptCancelBtn').onclick = () => {
        onConfirm(null);
        modal.remove();
      };
      input.focus();
    },

    // [LAUNCH] ULTRA-FAST Save all changes - minimal verification, instant execution
    async saveAllChanges() {
      // [STRICT] INSTANT SECURITY CHECK - Block if no permission (no waiting)
      if (!hasEditPermission()) {
        console.log('[SECURITY] Save blocked - no edit permission');
        this.showNoEditPermissionMessage();
        return;
      }

      console.log('[EDIT-MANAGER] Starting ultra-fast save...');

      const saveBtn = document.getElementById('saveChangesBtn');
      const originalText = saveBtn.textContent;
      saveBtn.textContent = 'Saving...';
      saveBtn.disabled = true;

      try {
        const formData = {
          W0Number: document.getElementById('editW0Number').value.trim(),
          FullName: document.getElementById('editFullName').value.trim(),
          Position: document.getElementById('editPosition').value,
          DateOfBirth: document.getElementById('editDateOfBirth').value,
          Class: document.getElementById('editClass').value.trim(),
        };

        const requiredFields = ['W0Number', 'FullName', 'Position', 'DateOfBirth', 'Class'];
        const missingFields = requiredFields.filter(field => !formData[field]);

        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        const response = await fetch(`/api/edit/prefects/${this.house}/${this.currentEditId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save changes');
        }

        // 🚀 ASYNC audit logging - don't wait for it
        if (window.auditLog) {
          window.auditLog
            .logActivity('prefect_updated', `Prefect updated: ${formData.FullName}`, {
              prefectId: this.currentEditId,
              house: this.house,
              oldValues: this.currentEditData.prefect,
              newValues: formData,
              status: 'success',
            })
            .catch(error => console.log('⚠️ Audit log failed:', error));
        }

        this.currentEditData.prefect = { ...this.currentEditData.prefect, ...formData };
        this.forceCloseEditModal();
        this.showSuccess('Prefect updated successfully');

        // 🚀 INSTANT reload - don't wait
        setTimeout(() => {
          this.refreshData();
          window.location.reload();
        }, 50);
      } catch (error) {
        console.error('[EDIT-MANAGER] Error saving changes:', error);
        this.showError(error.message);
      } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
      }
    },

    // Show/hide offense form
    showAddOffenseForm() {
      if (!this.isEditingEnabled()) {
        this.showNoEditPermissionMessage();
        return;
      }
      document.getElementById('addOffenseForm').classList.remove('hidden');
    },

    hideAddOffenseForm() {
      document.getElementById('addOffenseForm').classList.add('hidden');
      this.clearOffenseForm();
    },

    // Clear offense form
    clearOffenseForm() {
      document.getElementById('newOffenseDesc').value = '';
      document.getElementById('newOffensePoints').value = '';
      document.getElementById('newOffenseDate').value = new Date().toISOString().split('T')[0];
    },

    // Add offense
    async addOffense() {
      if (!this.isEditingEnabled()) {
        this.showNoEditPermissionMessage();
        return;
      }

      try {
        const offenseData = {
          Offense: document.getElementById('newOffenseDesc').value.trim(),
          PointsDeducted: parseInt(document.getElementById('newOffensePoints').value),
          Date: document.getElementById('newOffenseDate').value,
        };

        if (!offenseData.Offense || isNaN(offenseData.PointsDeducted) || !offenseData.Date) {
          throw new Error('All offense fields are required and Points Deducted must be a number.');
        }

        const response = await fetch(
          `/api/edit/prefects/${this.house}/${this.currentEditId}/offenses`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(offenseData),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to add offense');
        }

        // 🚀 ASYNC audit logging
        if (window.auditLog) {
          window.auditLog
            .logActivity(
              'offense_added',
              `Offense added for ${this.currentEditData.prefect.FullName}`,
              {
                prefectId: this.currentEditId,
                house: this.house,
                offense: offenseData.Offense,
                pointsDeducted: offenseData.PointsDeducted,
                date: offenseData.Date,
                status: 'success',
              }
            )
            .catch(error => console.log('⚠️ Audit log failed:', error));
        }

        await this.refreshEditModal();
        this.hideAddOffenseForm();
        this.showSuccess('Offense added successfully');
      } catch (error) {
        console.error('[EDIT-MANAGER] Error adding offense:', error);
        this.showError(error.message);
      }
    },

    // Remove offense
    async removeOffense(tempOffenseId) {
      if (!this.isEditingEnabled()) {
        this.showNoEditPermissionMessage();
        return;
      }

      this.showConfirmation('Are you sure you want to remove this offense?', async confirmed => {
        if (!confirmed) return;

        try {
          const offenseData = this.offenseMap.get(tempOffenseId);
          if (!offenseData) {
            throw new Error('Offense not found in temporary mapping');
          }

          const offenseIdentifier = {
            date: offenseData.Date,
            offense: offenseData.Offense,
            points: offenseData.PointsDeducted,
          };

          const response = await fetch(
            `/api/edit/prefects/${this.house}/${this.currentEditId}/offenses`,
            {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(offenseIdentifier),
            }
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to remove offense');
          }

          this.offenseMap.delete(tempOffenseId);
          await this.refreshEditModal();
          this.showSuccess('Offense removed successfully');
        } catch (error) {
          console.error('[EDIT-MANAGER] Error removing offense:', error);
          this.showError(error.message);
        }
      });
    },

    // Show/hide event form
    showAddEventForm() {
      if (!this.isEditingEnabled()) {
        this.showNoEditPermissionMessage();
        return;
      }
      document.getElementById('addEventForm').classList.remove('hidden');
    },

    hideAddEventForm() {
      document.getElementById('addEventForm').classList.add('hidden');
      this.clearEventForm();
    },

    // Clear event form
    clearEventForm() {
      document.getElementById('newGeneralEvent').value = '';
      document.getElementById('newHouseEvent').value = '';
    },

    // Add event
    async addEvent() {
      if (!this.isEditingEnabled()) {
        this.showNoEditPermissionMessage();
        return;
      }

      try {
        const generalEventId = document.getElementById('newGeneralEvent').value;
        const houseEventId = document.getElementById('newHouseEvent').value;

        if (!generalEventId && !houseEventId) {
          throw new Error('Please select either a General Event or House Event');
        }

        if (generalEventId && houseEventId) {
          throw new Error('Please select only one event type');
        }

        const eventData = {
          PrefectID: this.currentEditId,
          GeneralEventID: generalEventId || null,
          HouseEventsID: houseEventId || null,
        };

        const response = await fetch(
          `/api/edit/prefects/${this.house}/${this.currentEditId}/events`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to add event');
        }

        await this.refreshEditModal();
        this.hideAddEventForm();
        this.showSuccess('Event added successfully');
      } catch (error) {
        console.error('[EDIT-MANAGER] Error adding event:', error);
        this.showError(error.message);
      }
    },

    // Remove event
    async removeEvent(eventType, eventId) {
      if (!this.isEditingEnabled()) {
        this.showNoEditPermissionMessage();
        return;
      }

      this.showConfirmation(
        'Are you sure you want to remove this event participation?',
        async confirmed => {
          if (!confirmed) return;

          try {
            const response = await fetch(
              `/api/edit/prefects/${this.house}/${this.currentEditId}/events/${eventType}/${eventId}`,
              {
                method: 'DELETE',
              }
            );

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to remove event');
            }

            await this.refreshEditModal();
            this.showSuccess('Event removed successfully');
          } catch (error) {
            console.error('[EDIT-MANAGER] Error removing event:', error);
            this.showError(error.message);
          }
        }
      );
    },

    // Delete prefect — use custom confirmation + prompt modals (matches app UI)
    async deletePrefectFast(prefectId) {
      if (!this.isEditingEnabled()) {
        this.showNoEditPermissionMessage();
        return;
      }

      const prefectName = this.currentEditData.prefect.FullName;

      // Use custom confirmation modal (styled) instead of native confirm()
      const confirmationMessage = `⚠️ <strong>DELETE ${prefectName}?</strong><br/><br/>This will permanently remove:<br/>- All prefect data<br/>- All offense records<br/>- All event participation<br/><br/><strong>This action CANNOT be undone!</strong>`;

      this.showConfirmation(confirmationMessage, async confirmed => {
        if (!confirmed) return;

        // Use custom prompt modal to require typing the full name
        const promptMessage = `To confirm deletion, type the full name:`;
        this.showPrompt(promptMessage, async confirmation => {
          if (confirmation !== prefectName) {
            this.showError('Deletion cancelled - name did not match');
            return;
          }

          // Show immediate feedback on the Delete button
          const deleteBtn = document.querySelector(
            `button[onclick*="deletePrefectFast('${prefectId}')"]`
          );
          if (deleteBtn) {
            deleteBtn.textContent = 'Deleting...';
            deleteBtn.disabled = true;
            deleteBtn.style.backgroundColor = '#dc2626';
          }

          try {
            const response = await fetch(`/api/edit/prefects/${this.house}/${prefectId}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              const error = await response.json().catch(() => ({}));
              throw new Error(error.error || 'Failed to delete prefect');
            }

            // ASYNC audit logging - don't wait
            if (window.auditLog) {
              window.auditLog
                .logActivity('prefect_deleted', `Prefect deleted: ${prefectName}`, {
                  prefectId: prefectId,
                  house: this.house,
                  deletedData: this.currentEditData.prefect,
                  status: 'success',
                })
                .catch(error => console.log('⚠️ Audit log failed:', error));
            }

            this.forceCloseEditModal();
            this.showSuccess(`${prefectName} has been permanently deleted`);

            // Refresh shortly after deletion
            setTimeout(() => {
              this.refreshData();
              window.location.reload();
            }, 150);
          } catch (error) {
            console.error('[EDIT-MANAGER] Error deleting prefect:', error);
            this.showError(error.message);

            // Restore button state on error
            if (deleteBtn) {
              deleteBtn.textContent = 'Delete Prefect';
              deleteBtn.disabled = false;
              deleteBtn.style.backgroundColor = '';
            }
          }
        });
      });
    },

    // Keep original delete method for compatibility
    async deletePrefect(prefectId) {
      return this.deletePrefectFast(prefectId);
    },

    // Refresh edit modal data
    async refreshEditModal() {
      try {
        const url = `/api/edit/prefects/${this.house}/${this.currentEditId}`;
        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to refresh data');
        }

        const data = await response.json();
        this.currentEditData = data;

        this.offenseMap = new Map();
        data.offenses.forEach((offense, index) => {
          const tempId = `offense_${Date.now()}_${index}`;
          this.offenseMap.set(tempId, { ...offense, originalIndex: index });
        });

        document.getElementById('offensesList').innerHTML = this.generateOffensesList(
          data.offenses
        );
        document.getElementById('eventsList').innerHTML = this.generateEventsList(data.events);
      } catch (error) {
        console.error('[EDIT-MANAGER] Error refreshing edit modal:', error);
        this.showError('Failed to refresh data: ' + error.message);
      }
    },

    // Close edit modal with unsaved changes warning
    closeEditModal() {
      const hasUnsavedChanges = this.checkUnsavedChanges();

      if (hasUnsavedChanges) {
        this.showConfirmation(
          'You have unsaved changes. Are you sure you want to close without saving?',
          confirmed => {
            if (confirmed) {
              this.forceCloseEditModal();
            }
          }
        );
      } else {
        this.forceCloseEditModal();
      }
    },

    // Force close edit modal without checking for unsaved changes
    forceCloseEditModal() {
      const modal = document.getElementById('editPrefectModal');
      if (modal) {
        modal.classList.add('hidden');
      }
      this.currentEditData = null;
      this.currentEditId = null;
      if (this.offenseMap) {
        this.offenseMap.clear();
        this.offenseMap = null;
      }
    },

    // Check for unsaved changes
    checkUnsavedChanges() {
      if (!this.currentEditData || !this.currentEditData.prefect) return false;

      const currentData = this.currentEditData.prefect;
      const formElements = {
        W0Number: document.getElementById('editW0Number'),
        FullName: document.getElementById('editFullName'),
        Position: document.getElementById('editPosition'),
        DateOfBirth: document.getElementById('editDateOfBirth'),
        Class: document.getElementById('editClass'),
      };

      return Object.keys(formElements).some(key => {
        const element = formElements[key];
        if (!element) return false;
        const formValue = element.value.trim();
        const originalValue = (currentData[key] || '').toString().trim();
        return formValue !== originalValue;
      });
    },

    // Show success message
    showSuccess(message) {
      const successDiv = document.createElement('div');
      successDiv.className =
        'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 transform transition-transform duration-300 translate-x-full';
      successDiv.innerHTML = `
                <div class="flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    ${message}
                </div>
            `;
      document.body.appendChild(successDiv);

      // Animate in
      setTimeout(() => successDiv.classList.remove('translate-x-full'), 10);

      // Auto-remove with animation
      setTimeout(() => {
        successDiv.classList.add('translate-x-full');
        setTimeout(() => successDiv.remove(), 300);
      }, 3000);
    },

    // Show error message
    showError(message) {
      const errorDiv = document.createElement('div');
      errorDiv.className =
        'fixed top-4 right-4 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 transform transition-transform duration-300 translate-x-full';
      errorDiv.innerHTML = `
                <div class="flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Error: ${message}
                </div>
            `;
      document.body.appendChild(errorDiv);

      // Animate in
      setTimeout(() => errorDiv.classList.remove('translate-x-full'), 10);

      // Auto-remove with animation
      setTimeout(() => {
        errorDiv.classList.add('translate-x-full');
        setTimeout(() => errorDiv.remove(), 300);
      }, 5000);
    },
  });

  // 🚀 ADD SECURE AUTH CHECK METHOD TO TABLE MANAGER
  PrefectTableManager.prototype.checkEditPermissionInstant = checkEditPermissionInstant;

  // 🚀 ULTRA-FAST init override - initialize edit manager early to allow instant buttons
  PrefectTableManager.prototype.init = async function () {
    // Initialize edit manager immediately so permission checks and modal exist early
    try {
      this.initEditManager();
      this.loadEventsInBackground();
    } catch (e) {
      console.warn('[EDIT-MANAGER] Early init failed (continuing):', e);
    }

    // Then proceed with original initialization (data load, rendering)
    await originalInit.call(this);
  };
}
