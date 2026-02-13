/**
 * Prefect Table Manager - Fixed Version with New Schema Support
 * Handles table display, search, filtering, and detailed popup modals
 * Updated to support W0Number and Class fields
 */

class PrefectTableManager {
  // [SUCCESS] ADD THIS METHOD TO THE END OF PrefectTableManager CLASS:
  checkAuthAndEdit(prefectId) {
    console.log('[PrefectManager] Edit button clicked for:', prefectId);

    // Quick auth check
    const hasEditAuth =
      window.authSystem &&
      window.authSystem.userRole &&
      window.authSystem.userRole.includes('EDIT');

    if (hasEditAuth && this.showEditModal) {
      // Auth ready and has permissions - show edit modal
      this.showEditModal(prefectId);
    } else if (hasEditAuth && window.prefectManager && window.prefectManager.showEditModal) {
      // Try global reference
      window.prefectManager.showEditModal(prefectId);
    } else {
      // No auth or no permissions - show message
      this.showLoadingMessage();
    }
  }

  // [SUCCESS] ADD THIS METHOD TOO:
  showLoadingMessage() {
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
            <i class="icon icon-loading icon-spin"></i>
            <span><strong>Loading:</strong> Please wait for the system to load, then try again.</span>
        </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  constructor(house) {
    this.house = house;
    this.prefects = [];
    this.filteredPrefects = [];
    this.offenses = [];
    this.events = [];
    this.generalEvents = [];
    this.houseEvents = [];
    this.currentSort = { column: null, direction: 'asc' };
    this.debug = true; // Enable debug mode

    this.init();
  }

  debugLog(message, data = null) {
    if (this.debug) {
      console.log(`[PrefectManager] ${message}`, data || '');
    }
  }
  // [LAUNCH] ADD THIS METHOD TO YOUR PrefectTableManager CLASS:

  checkEditPermissionInstant() {
    // Multiple ways to check auth instantly - no waiting!

    // Method 1: Check if authSystem is already loaded
    if (window.authSystem && window.authSystem.userRole) {
      const hasEdit = window.authSystem.userRole.includes('EDIT');
      console.log('[INSTANT-AUTH] Method 1 - authSystem available:', hasEdit);
      return hasEdit;
    }

    // Method 2: Check Firebase auth directly
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
      const user = firebase.auth().currentUser;
      console.log('[INSTANT-AUTH] Method 2 - Firebase user:', user.email);

      // Check if we have cached role info in localStorage
      const cachedRole = localStorage.getItem(`userRole_${user.email}`);
      if (cachedRole && cachedRole.includes('EDIT')) {
        console.log('[INSTANT-AUTH] Method 2 - Cached role has edit:', true);
        return true;
      }
    }

    // Method 3: Check for edit manager presence
    if (window.editManagerInitialized && this.editEnabled === true) {
      console.log('[INSTANT-AUTH] Method 3 - Edit manager enabled:', true);
      return true;
    }

    // Method 4: Check for edit-related DOM elements (fallback)
    const hasEditModal = document.getElementById('editPrefectModal');
    if (hasEditModal) {
      console.log('[INSTANT-AUTH] Method 4 - Edit modal exists:', true);
      return true;
    }

    console.log('[INSTANT-AUTH] No edit permission detected');
    return false;
  }
  async init() {
    this.debugLog('Initializing PrefectTableManager for house:', this.house);
    try {
      await this.loadData();
      this.setupEventListeners();
      this.renderTables();
      this.createModal();
      this.debugLog('Initialization complete');
    } catch (error) {
      console.error('Failed to initialize table manager:', error);
      this.showError('Failed to load prefect data');
    }
  }

  async loadData() {
    this.debugLog('Loading data...');
    try {
      // Parallelize independent fetches to speed up load
      const [prefectsResp, offensesResp, eventsResp, generalEventsResp, houseEventsResp] =
        await Promise.all([
          fetch(`/api/prefects/${this.house}`),
          fetch(`/api/offenses/${this.house}`),
          fetch(`/api/events-participation/${this.house}`),
          fetch('/api/general-events'),
          fetch('/api/house-events'),
        ]);

      // Parse responses with graceful fallback
      const prefectsData =
        (await (prefectsResp.ok ? prefectsResp.json() : Promise.resolve([]))) || [];
      const offensesData =
        (await (offensesResp.ok ? offensesResp.json() : Promise.resolve([]))) || [];
      const eventsData = (await (eventsResp.ok ? eventsResp.json() : Promise.resolve([]))) || [];
      const generalEventsData =
        (await (generalEventsResp.ok ? generalEventsResp.json() : Promise.resolve([]))) || [];
      const houseEventsData =
        (await (houseEventsResp.ok ? houseEventsResp.json() : Promise.resolve([]))) || [];

      this.debugLog('Raw prefects data:', prefectsData);
      this.debugLog('Offenses data length:', offensesData.length);

      // Keep raw arrays for backward compatibility
      this.offenses = offensesData;
      this.events = eventsData;
      this.generalEvents = generalEventsData;
      this.houseEvents = houseEventsData;

      // Pre-index offenses by PrefectID to avoid repeated .filter calls
      const offensesByPrefect = new Map();
      for (const off of offensesData) {
        const id = off.PrefectID || '';
        if (!offensesByPrefect.has(id)) offensesByPrefect.set(id, []);
        offensesByPrefect.get(id).push(off);
      }

      // Calculate total points for each prefect (100 - offense points) using the index
      const processedPrefects = prefectsData.map(prefect => {
        const prefectOffenses = offensesByPrefect.get(prefect.PrefectID) || [];
        const totalOffensePoints = prefectOffenses.reduce(
          (sum, offense) => sum + (offense.PointsDeducted || 0),
          0
        );
        const totalPoints = Math.max(0, 100 - totalOffensePoints);

        return {
          ...prefect,
          TotalPoints: totalPoints,
          OffensePoints: totalOffensePoints,
          OffenseCount: prefectOffenses.length,
        };
      });

      this.prefects = processedPrefects;
      this.filteredPrefects = [...this.prefects];
      this.debugLog('Processed prefects with points:', this.prefects.length);
      this.debugLog('Event participation data length:', this.events.length);
      this.debugLog('General events:', this.generalEvents.length);
      this.debugLog('House events:', this.houseEvents.length);

      this.debugLog('Data loading complete');
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  setupEventListeners() {
    this.debugLog('Setting up event listeners');
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const positionFilter = document.getElementById('positionFilter');
    const pointsFilter = document.getElementById('pointsFilter');
    const gradeFilter = document.getElementById('gradeFilter'); // New grade filter
    const clearButton = document.getElementById('clearSearch');

    if (searchInput) {
      searchInput.addEventListener('input', () => this.handleSearch());
    }

    if (positionFilter) {
      positionFilter.addEventListener('change', () => this.handleSearch());
    }

    if (pointsFilter) {
      pointsFilter.addEventListener('change', () => this.handleSearch());
    }

    if (gradeFilter) {
      gradeFilter.addEventListener('change', () => this.handleSearch());
    }

    if (clearButton) {
      clearButton.addEventListener('click', () => this.clearSearch());
    }

    // Table sorting
    document.addEventListener('click', e => {
      if (e.target.classList.contains('sortable-header')) {
        this.handleSort(e.target.dataset.column);
      }
    });
  }

  handleSearch() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const positionFilter = document.getElementById('positionFilter')?.value || '';
    const pointsFilter = document.getElementById('pointsFilter')?.value || '';
    const gradeFilter = document.getElementById('gradeFilter')?.value || '';

    this.debugLog('Searching with:', { searchTerm, positionFilter, pointsFilter, gradeFilter });

    this.filteredPrefects = this.prefects.filter(prefect => {
      // Search term filter - now includes W0Number and Class
      const matchesSearch =
        !searchTerm ||
        prefect.FullName.toLowerCase().includes(searchTerm) ||
        prefect.PrefectID.toLowerCase().includes(searchTerm) ||
        prefect.Position.toLowerCase().includes(searchTerm) ||
        (prefect.W0Number && prefect.W0Number.toLowerCase().includes(searchTerm)) ||
        (prefect.Class && prefect.Class.toLowerCase().includes(searchTerm));

      // Position filter
      const matchesPosition = !positionFilter || prefect.Position === positionFilter;

      // Points filter - now using calculated total points (100 - offense points)
      let matchesPoints = true;
      if (pointsFilter) {
        const points = prefect.TotalPoints || 0;
        const [min, max] = pointsFilter.split('-').map(Number);
        matchesPoints = points >= min && points <= max;
      }

      // Grade filter - filter by grade level from Class field
      let matchesGrade = true;
      if (gradeFilter && prefect.Class) {
        const prefectGrade = prefect.Class.substring(0, 2); // Extract grade (e.g., "11" from "11 Sci A")
        matchesGrade = prefectGrade === gradeFilter;
      }

      return matchesSearch && matchesPosition && matchesPoints && matchesGrade;
    });

    this.debugLog('Filtered results:', this.filteredPrefects.length);
    this.updateSearchStats();
    this.renderTables();
  }

  clearSearch() {
    this.debugLog('Clearing search');
    document.getElementById('searchInput').value = '';
    document.getElementById('positionFilter').value = '';
    document.getElementById('pointsFilter').value = '';
    if (document.getElementById('gradeFilter')) {
      document.getElementById('gradeFilter').value = '';
    }
    this.filteredPrefects = [...this.prefects];
    this.updateSearchStats();
    this.renderTables();
  }

  updateSearchStats() {
    const statsElement = document.getElementById('searchStats');
    const countElement = document.getElementById('resultsCount');

    if (statsElement && countElement) {
      countElement.textContent = this.filteredPrefects.length;
      statsElement.classList.remove('hidden');
    }
  }

  handleSort(column) {
    this.debugLog('Sorting by column:', column);
    if (this.currentSort.column === column) {
      this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSort.column = column;
      this.currentSort.direction = 'asc';
    }

    this.filteredPrefects.sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];

      // Handle different data types
      if (column === 'DateOfBirth') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else if (column === 'TotalPoints' || column === 'OffenseCount' || column === 'EventCount') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return this.currentSort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.currentSort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    this.renderTables();
  }

  renderTables() {
    this.debugLog('Rendering tables');
    // Group prefects by position
    const positionGroups = this.groupPrefectsByPosition();
    this.debugLog('Position groups:', positionGroups);

    // Render each position table
    Object.entries(positionGroups).forEach(([position, prefects]) => {
      this.renderPositionTable(position, prefects);
    });
  }

  groupPrefectsByPosition() {
    const groups = {};
    this.filteredPrefects.forEach(prefect => {
      const position = prefect.Position;
      if (!groups[position]) {
        groups[position] = [];
      }
      groups[position].push(prefect);
    });
    return groups;
  }

  // Add this update to your existing prefect-table-manager.js file
  // Find the renderPositionTable method and update the tableMap section:

  // [LAUNCH] INSTANT AUTH CHECK - Replace your renderPositionTable method with this:

  renderPositionTable(position, prefects) {
    this.debugLog(`Rendering table for position: ${position}`, prefects);

    // Map position to table ID based on house and your actual HTML table IDs
    let tableMap = {};

    if (this.house === 'Central') {
      tableMap = {
        'Head Prefect': 'HPTable',
        'Deputy Head Prefect': 'DHPTable',
        'Games Captain': 'GCTable',
        'Deputy Games Captain': 'DGCTable',
      };
    } else {
      // For house pages (Aquila, Cetus, Cygnus, Ursa)
      const housePrefix = this.house;
      tableMap = {
        'House Captain': `${housePrefix}HouseCaptain`,
        'Deputy House Captain': `${housePrefix}DeputyHouseCaptain`,
        'House Games Captain': `${housePrefix}HouseGamesCaptain`,
        'Deputy House Games Captain': `${housePrefix}DeputyHouseGamesCaptain`,
        Prefects: `${housePrefix}Prefects`,
        Prefect: `${housePrefix}Prefects`,
        'House Prefects': `${housePrefix}HousePrefects`,
        'Prefect Interns': `${housePrefix}PrefectInterns`,
      };
    }

    const tableId = tableMap[position];
    const table = document.getElementById(tableId);

    if (!table) {
      this.debugLog(`Table not found for position ${position} (looking for ID: ${tableId})`);
      return;
    }

    const tbody = table.querySelector('tbody');
    if (!tbody) {
      this.debugLog(`Tbody not found for table ${tableId}`);
      return;
    }

    tbody.innerHTML = '';

    if (prefects.length === 0) {
      tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-gray-500">
                    No prefects found for this position
                </td>
            </tr>
        `;
      return;
    }

    // [LAUNCH] INSTANT AUTH CHECK - Check permissions right now, no waiting
    const hasEditPermission = this.checkEditPermissionInstant();
    console.log('[INSTANT-AUTH] User has edit permission:', hasEditPermission);

    // Sort prefects by PrefectID before rendering
    const sortedPrefects = [...prefects].sort((a, b) => {
      const aId = a.PrefectID || '';
      const bId = b.PrefectID || '';
      return aId.localeCompare(bId);
    });

    // Batch DOM updates: build all rows as HTML and assign once to reduce reflows
    const rows = [];

    sortedPrefects.forEach(prefect => {
      // [LAUNCH] CONDITIONAL BUTTONS - Show edit button only if user has permission
      const buttonsHTML = hasEditPermission
        ? `
        <div class="flex space-x-2">
          <button onclick="prefectManager.showPrefectDetails('${prefect.PrefectID}')" 
              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors duration-200 text-sm">
            View
          </button>
          <button onclick="prefectManager.showEditModal('${prefect.PrefectID}')" 
              class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors duration-200 text-sm">
            Edit
          </button>
        </div>
      `
        : `
        <button onclick="prefectManager.showPrefectDetails('${prefect.PrefectID}')" 
            class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors duration-200 text-sm">
          View Details
        </button>
      `;

      rows.push(`
        <tr class="hover:bg-gray-50 transition-colors duration-200">
          <td class="px-4 py-3 border">${prefect.W0Number || 'N/A'}</td>
          <td class="px-4 py-3 border font-medium">${prefect.FullName || 'N/A'}</td>
          <td class="px-4 py-3 border">${prefect.Class || 'N/A'}</td>
          <td class="px-4 py-3 border">${this.formatDate(prefect.DateOfBirth)}</td>
          <td class="px-4 py-3 border">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${this.getPointsBadgeClass(prefect.TotalPoints)}">
              ${prefect.TotalPoints || 0} points
            </span>
          </td>
          <td class="px-4 py-3 border">
            ${buttonsHTML}
          </td>
        </tr>
      `);
    });

    tbody.innerHTML = rows.join('');
  }
  // Also update the getTableIdForPosition function in prefect-search-filter.js:
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getPointsBadgeClass(points) {
    if (!points || points === 0) return 'bg-red-100 text-red-800'; // 0 points = bad
    if (points >= 90) return 'bg-green-100 text-green-800'; // 90+ points = excellent
    if (points >= 70) return 'bg-yellow-100 text-yellow-800'; // 70-89 points = good
    return 'bg-orange-100 text-orange-800'; // Below 70 = needs improvement
  }

  createModal() {
    this.debugLog('Creating modal');
    const modalHTML = `
            <div id="prefectModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-lg max-w-7xl w-full max-h-screen overflow-y-auto custom-scrollbar">
                    <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
                        <h2 id="modalTitle" class="text-2xl font-bold text-gray-900">Prefect Details</h2>
                        <button onclick="prefectManager.closeModal()" class="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div id="modalContent" class="p-6">
                        <!-- Content will be loaded here -->
                    </div>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  async showPrefectDetails(prefectId) {
    this.debugLog('Showing details for prefect:', prefectId);
    const prefect = this.prefects.find(p => p.PrefectID === prefectId);
    if (!prefect) {
      this.debugLog('Prefect not found:', prefectId);
      return;
    }

    // Show modal with loading state
    const modal = document.getElementById('prefectModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');

    modalTitle.textContent = `${prefect.FullName} - Details`;
    modalContent.innerHTML =
      '<div class="text-center py-8"><div class="loading-spinner mx-auto"></div><p class="mt-2">Loading details...</p></div>';
    modal.classList.remove('hidden');

    try {
      // Get prefect's offenses
      const prefectOffenses = this.offenses.filter(offense => offense.PrefectID === prefectId);
      this.debugLog('Prefect offenses:', prefectOffenses);

      // Get prefect's event participation
      const prefectEvents = this.events.filter(event => event.PrefectID === prefectId);
      this.debugLog('Prefect events:', prefectEvents);

      // Calculate event statistics
      const eventStats = this.calculateEventStats(prefectEvents);
      this.debugLog('Event statistics:', eventStats);

      // Render modal content
      modalContent.innerHTML = this.generateModalContent(
        prefect,
        prefectOffenses,
        prefectEvents,
        eventStats
      );
    } catch (error) {
      console.error('Error loading prefect details:', error);
      modalContent.innerHTML =
        '<div class="text-center py-8 text-red-600">Error loading details</div>';
    }
  }

  calculateEventStats(prefectEvents) {
    this.debugLog('Calculating event stats for events:', prefectEvents);

    // Get attended events
    const attendedGeneralEvents = prefectEvents
      .filter(e => e.GeneralEventID)
      .map(e => e.GeneralEventID);
    const attendedHouseEvents = prefectEvents
      .filter(e => e.HouseEventsID)
      .map(e => e.HouseEventsID);

    this.debugLog('Attended general events:', attendedGeneralEvents);
    this.debugLog('Attended house events:', attendedHouseEvents);

    // Calculate percentages
    const totalGeneralEvents = this.generalEvents.length;
    const totalHouseEvents = this.houseEvents.length;

    const generalAttendance =
      totalGeneralEvents > 0 ? (attendedGeneralEvents.length / totalGeneralEvents) * 100 : 0;
    const houseAttendance =
      totalHouseEvents > 0 ? (attendedHouseEvents.length / totalHouseEvents) * 100 : 0;

    const totalEventsAttended = attendedGeneralEvents.length + attendedHouseEvents.length;
    const totalEventsAvailable = totalGeneralEvents + totalHouseEvents;
    const overallAttendance =
      totalEventsAvailable > 0 ? (totalEventsAttended / totalEventsAvailable) * 100 : 0;

    const stats = {
      general: {
        attended: attendedGeneralEvents.length,
        total: totalGeneralEvents,
        percentage: generalAttendance,
      },
      house: {
        attended: attendedHouseEvents.length,
        total: totalHouseEvents,
        percentage: houseAttendance,
      },
      overall: {
        attended: totalEventsAttended,
        total: totalEventsAvailable,
        percentage: overallAttendance,
      },
    };

    this.debugLog('Calculated event stats:', stats);
    return stats;
  }

  generateModalContent(prefect, offenses, events, eventStats) {
    return `
            <!-- Section 1: Prefect Details - Updated with new schema -->
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6 border border-blue-200">
                <h3 class="text-2xl font-bold mb-6 text-gray-900 flex items-center">
                    <div class="bg-blue-500 p-2 rounded-full mr-3">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                    </div>
                    Personal Information
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <div class="bg-white p-4 rounded-lg border border-gray-200">
                            <span class="block text-sm font-medium text-gray-500 mb-1">Full Name</span>
                            <span class="text-lg font-semibold text-gray-900">${prefect.FullName || 'N/A'}</span>
                        </div>
                        <div class="bg-white p-4 rounded-lg border border-gray-200">
                            <span class="block text-sm font-medium text-gray-500 mb-1">Prefect ID</span>
                            <span class="text-lg font-semibold text-gray-900">${prefect.PrefectID || 'N/A'}</span>
                        </div>
                        <div class="bg-white p-4 rounded-lg border border-gray-200">
                            <span class="block text-sm font-medium text-gray-500 mb-1">W0 Number</span>
                            <span class="text-lg font-semibold text-blue-600">${prefect.W0Number || 'N/A'}</span>
                        </div>
                        <div class="bg-white p-4 rounded-lg border border-gray-200">
                            <span class="block text-sm font-medium text-gray-500 mb-1">House</span>
                            <span class="text-lg font-semibold text-${this.house.toLowerCase()}-600">${this.house}</span>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <div class="bg-white p-4 rounded-lg border border-gray-200">
                            <span class="block text-sm font-medium text-gray-500 mb-1">Position</span>
                            <span class="text-lg font-semibold text-gray-900">${prefect.Position || 'N/A'}</span>
                        </div>
                        <div class="bg-white p-4 rounded-lg border border-gray-200">
                            <span class="block text-sm font-medium text-gray-500 mb-1">Date of Birth</span>
                            <span class="text-lg font-semibold text-gray-900">${this.formatDate(prefect.DateOfBirth)}</span>
                        </div>
                        <div class="bg-white p-4 rounded-lg border border-gray-200">
                            <span class="block text-sm font-medium text-gray-500 mb-1">Class</span>
                            <span class="text-lg font-semibold text-green-600">${prefect.Class || 'N/A'}</span>
                        </div>
                        <div class="bg-white p-4 rounded-lg border border-gray-200">
                            <span class="block text-sm font-medium text-gray-500 mb-1">Grade Level</span>
                            <span class="text-lg font-semibold text-purple-600">${prefect.Class ? prefect.Class.substring(0, 2) : 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Overall Score Display -->
                <div class="mt-6 bg-white p-6 rounded-lg border border-gray-200">
                    <div class="text-center">
                        <span class="block text-sm font-medium text-gray-500 mb-2">Overall Performance Score</span>
                        <div class="text-4xl font-bold ${prefect.TotalPoints >= 90 ? 'text-green-600' : prefect.TotalPoints >= 70 ? 'text-yellow-600' : 'text-red-600'} mb-2">
                            ${prefect.TotalPoints || 0}/100
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3">
                            <div class="h-3 rounded-full ${prefect.TotalPoints >= 90 ? 'bg-green-500' : prefect.TotalPoints >= 70 ? 'bg-yellow-500' : 'bg-red-500'}" 
                                 style="width: ${prefect.TotalPoints || 0}%"></div>
                        </div>
                        <span class="block text-sm text-gray-500 mt-2">
                            ${prefect.OffensePoints || 0} points deducted from offenses
                        </span>
                    </div>
                </div>
            </div>

            <!-- Section 2: Offense History -->
            <div class="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-6 mb-6 border border-red-200">
                <h3 class="text-2xl font-bold mb-6 text-gray-900 flex items-center">
                    <div class="bg-red-500 p-2 rounded-full mr-3">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                    </div>
                    Discipline Record
                </h3>
                
                <!-- Offense Summary Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
                        <div class="text-2xl font-bold text-red-600">${prefect.OffensePoints || 0}</div>
                        <div class="text-sm text-gray-500">Points Deducted</div>
                    </div>
                    <div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
                        <div class="text-2xl font-bold text-orange-600">${offenses.length}</div>
                        <div class="text-sm text-gray-500">Total Offenses</div>
                    </div>
                    <div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
                        <div class="text-2xl font-bold ${(prefect.TotalPoints || 0) >= 90 ? 'text-green-600' : (prefect.TotalPoints || 0) >= 70 ? 'text-yellow-600' : 'text-red-600'}">
                            ${(prefect.TotalPoints || 0) >= 90 ? 'Excellent' : (prefect.TotalPoints || 0) >= 70 ? 'Good' : 'Needs Improvement'}
                        </div>
                        <div class="text-sm text-gray-500">Status</div>
                    </div>
                </div>
                
                ${
                  offenses.length > 0
                    ? `
                    <div class="bg-white rounded-lg border border-gray-200">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <h4 class="text-lg font-semibold text-gray-900">Offense Details</h4>
                        </div>
                        <div class="max-h-64 overflow-y-auto custom-scrollbar">
                            <div class="p-4 space-y-3">
                                ${offenses
                                  .sort((a, b) => new Date(b.Date) - new Date(a.Date))
                                  .map(
                                    offense => `
                                    <div class="flex items-start justify-between p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                                        <div class="flex-1">
                                            <h5 class="font-medium text-gray-900 mb-1">${offense.Offense || 'N/A'}</h5>
                                            <p class="text-sm text-gray-600">
                                                <svg class="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                </svg>
                                                ${this.formatDate(offense.Date)}
                                            </p>
                                        </div>
                                        <div class="ml-4">
                                            <span class="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                                -${offense.PointsDeducted || 0} pts
                                            </span>
                                        </div>
                                    </div>
                                `
                                  )
                                  .join('')}
                            </div>
                        </div>
                    </div>
                `
                    : `
                    <div class="bg-white p-8 rounded-lg border border-gray-200 text-center">
                        <div class="text-green-500 mb-4">
                            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <h4 class="text-xl font-semibold text-green-600 mb-2">Clean Record!</h4>
                        <p class="text-gray-500">This prefect has no recorded offenses and maintains excellent discipline.</p>
                    </div>
                `
                }
            </div>

            <!-- Section 3: Events Participation -->
            <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                <h3 class="text-2xl font-bold mb-6 text-gray-900 flex items-center">
                    <div class="bg-green-500 p-2 rounded-full mr-3">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                    Event Participation
                </h3>
                
                <!-- Event Statistics Summary -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div class="bg-white p-6 rounded-lg border border-gray-200 text-center">
                        <div class="text-blue-500 mb-3">
                            <svg class="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                            </svg>
                        </div>
                        <h4 class="font-semibold text-gray-700 mb-2">House Events</h4>
                        <div class="text-3xl font-bold text-blue-600 mb-1">${eventStats.house.attended}/${eventStats.house.total}</div>
                        <div class="text-sm text-gray-500 mb-3">${eventStats.house.percentage.toFixed(1)}% attendance</div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-600 h-2 rounded-full transition-all duration-500" style="width: ${eventStats.house.percentage}%"></div>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg border border-gray-200 text-center">
                        <div class="text-green-500 mb-3">
                            <svg class="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"></path>
                            </svg>
                        </div>
                        <h4 class="font-semibold text-gray-700 mb-2">General Events</h4>
                        <div class="text-3xl font-bold text-green-600 mb-1">${eventStats.general.attended}/${eventStats.general.total}</div>
                        <div class="text-sm text-gray-500 mb-3">${eventStats.general.percentage.toFixed(1)}% attendance</div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-green-600 h-2 rounded-full transition-all duration-500" style="width: ${eventStats.general.percentage}%"></div>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg border border-gray-200 text-center">
                        <div class="text-purple-500 mb-3">
                            <svg class="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z"></path>
                            </svg>
                        </div>
                        <h4 class="font-semibold text-gray-700 mb-2">Overall</h4>
                        <div class="text-3xl font-bold text-purple-600 mb-1">${eventStats.overall.attended}/${eventStats.overall.total}</div>
                        <div class="text-sm text-gray-500 mb-3">${eventStats.overall.percentage.toFixed(1)}% attendance</div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-purple-600 h-2 rounded-full transition-all duration-500" style="width: ${eventStats.overall.percentage}%"></div>
                        </div>
                    </div>
                </div>

                <!-- Event Details -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- House Events -->
                    <div class="bg-white rounded-lg border border-gray-200">
                        <div class="px-6 py-4 border-b border-gray-200 bg-blue-50">
                            <h4 class="text-lg font-semibold text-blue-800 flex items-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                </svg>
                                House Events Attended (${eventStats.house.attended})
                            </h4>
                        </div>
                        <div class="max-h-64 overflow-y-auto custom-scrollbar">
                            ${this.renderEventsList(
                              events.filter(e => e.HouseEventsID),
                              'house'
                            )}
                        </div>
                    </div>
                    
                    <!-- General Events -->
                    <div class="bg-white rounded-lg border border-gray-200">
                        <div class="px-6 py-4 border-b border-gray-200 bg-green-50">
                            <h4 class="text-lg font-semibold text-green-800 flex items-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"></path>
                                </svg>
                                General Events Attended (${eventStats.general.attended})
                            </h4>
                        </div>
                        <div class="max-h-64 overflow-y-auto custom-scrollbar">
                            ${this.renderEventsList(
                              events.filter(e => e.GeneralEventID),
                              'general'
                            )}
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  renderEventsList(events, type) {
    this.debugLog(`Rendering ${type} events list:`, events);

    if (events.length === 0) {
      return `
                <div class="text-center py-8">
                    <div class="text-gray-400 mb-3">
                        <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                    <p class="text-gray-500 font-medium">No ${type} events attended</p>
                    <p class="text-sm text-gray-400">This prefect hasn't participated in any ${type} events yet.</p>
                </div>
            `;
    }

    return `
            <div class="p-4 space-y-3">
                ${events
                  .map(event => {
                    let eventName, eventDate, eventId;

                    if (type === 'house') {
                      // First try to get data from the joined query result
                      eventName = event.HouseEventName;
                      eventDate = event.HouseDate;
                      eventId = event.HouseEventsID;

                      // If name is still null, try to find it from houseEvents array
                      if (!eventName && eventId) {
                        const foundEvent = this.houseEvents.find(e => e.HouseEventID === eventId);
                        if (foundEvent) {
                          eventName = foundEvent.HouseEventName;
                          eventDate = foundEvent.EventDateHeld;
                        }
                      }

                      // If still no name, use a default
                      if (!eventName) {
                        eventName = `House Event ${eventId || 'Unknown'}`;
                      }
                    } else {
                      // First try to get data from the joined query result
                      eventName = event.GeneralEventName;
                      eventDate = event.GeneralDate;
                      eventId = event.GeneralEventID;

                      // If name is still null, try to find it from generalEvents array
                      if (!eventName && eventId) {
                        const foundEvent = this.generalEvents.find(
                          e => e.GeneralEventID === eventId
                        );
                        if (foundEvent) {
                          eventName = foundEvent.GeneralEventName;
                          eventDate = foundEvent.EventDateHeld;
                        }
                      }

                      // If still no name, use a default
                      if (!eventName) {
                        eventName = `General Event ${eventId || 'Unknown'}`;
                      }
                    }

                    this.debugLog(`Event mapping for ${type}:`, {
                      original: event,
                      mapped: { eventName, eventDate, eventId },
                      foundInMaster:
                        type === 'house'
                          ? this.houseEvents.find(e => e.HouseEventID === eventId)
                          : this.generalEvents.find(e => e.GeneralEventID === eventId),
                    });

                    return `
                        <div class="flex items-start p-4 bg-gray-50 rounded-lg border-l-4 ${type === 'house' ? 'border-blue-500' : 'border-green-500'} hover:bg-gray-100 transition-colors duration-200">
                            <div class="flex-shrink-0 mr-3 mt-1">
                                <div class="w-3 h-3 rounded-full ${type === 'house' ? 'bg-blue-500' : 'bg-green-500'}"></div>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h5 class="font-medium text-gray-900 truncate">${eventName}</h5>
                                <p class="text-sm text-gray-600 mt-1 flex items-center">
                                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    ${eventDate ? this.formatDate(eventDate) : 'Date not available'}
                                </p>
                                ${eventId ? `<p class="text-xs text-gray-400 mt-1">Event ID: ${eventId}</p>` : ''}
                            </div>
                            <div class="flex-shrink-0">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${type === 'house' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                                    Attended
                                </span>
                            </div>
                        </div>
                    `;
                  })
                  .join('')}
            </div>
        `;
  }

  closeModal() {
    this.debugLog('Closing modal');
    const modal = document.getElementById('prefectModal');
    modal.classList.add('hidden');
  }

  showError(message) {
    console.error(message);
    // Create a better error notification
    const errorDiv = document.createElement('div');
    errorDiv.className =
      'fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
    errorDiv.innerHTML = `
            <div class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                ${message}
            </div>
        `;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  // New utility methods for schema support

  /**
   * Get unique grades from all prefects in current house
   */
  getAvailableGrades() {
    const grades = new Set();
    this.prefects.forEach(prefect => {
      if (prefect.Class) {
        const grade = prefect.Class.substring(0, 2);
        grades.add(grade);
      }
    });
    return Array.from(grades).sort();
  }

  /**
   * Get unique positions from all prefects in current house
   */
  getAvailablePositions() {
    const positions = new Set();
    this.prefects.forEach(prefect => {
      if (prefect.Position) {
        positions.add(prefect.Position);
      }
    });
    return Array.from(positions).sort();
  }

  /**
   * Get unique classes from all prefects in current house
   */
  getAvailableClasses() {
    const classes = new Set();
    this.prefects.forEach(prefect => {
      if (prefect.Class) {
        classes.add(prefect.Class);
      }
    });
    return Array.from(classes).sort();
  }

  /**
   * Search across multiple fields including new schema fields
   */
  searchPrefects(
    searchTerm,
    searchFields = ['FullName', 'PrefectID', 'W0Number', 'Position', 'Class']
  ) {
    if (!searchTerm) return this.prefects;

    const term = searchTerm.toLowerCase();
    return this.prefects.filter(prefect => {
      return searchFields.some(field => {
        const value = prefect[field];
        return value && value.toString().toLowerCase().includes(term);
      });
    });
  }

  /**
   * Export prefect data as CSV (including new schema fields)
   */
  exportToCSV() {
    const headers = [
      'PrefectID',
      'W0Number',
      'FullName',
      'Position',
      'DateOfBirth',
      'Class',
      'House',
      'TotalPoints',
      'OffensePoints',
      'OffenseCount',
    ];
    const csvContent = [
      headers.join(','),
      ...this.filteredPrefects.map(prefect =>
        headers
          .map(header => {
            let value = prefect[header] || '';
            if (header === 'House') value = this.house;
            // Escape commas in values
            if (value.toString().includes(',')) {
              value = `"${value}"`;
            }
            return value;
          })
          .join(',')
      ),
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.house}_Prefects_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Refresh data from server
   */
  async refreshData() {
    this.debugLog('Refreshing data...');
    try {
      await this.loadData();
      this.renderTables();
      this.debugLog('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      this.showError('Failed to refresh data');
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  // Detect house from current page
  const currentPage = window.location.pathname.split('/').pop().replace('.html', '');

  const houseMap = {
    central: 'Central',
    aquila: 'Aquila',
    cetus: 'Cetus',
    cygnus: 'Cygnus',
    ursa: 'Ursa',
  };

  const house = houseMap[currentPage];

  if (house) {
    console.log(`[PrefectManager] Initializing for house: ${house}`);
    window.prefectManager = new PrefectTableManager(house);

    // Add global debug commands
    window.debugPrefects = () => {
      console.log('=== PREFECT DEBUG INFO ===');
      console.log('Current house:', window.prefectManager.house);
      console.log('All prefects:', window.prefectManager.prefects);
      console.log('Filtered prefects:', window.prefectManager.filteredPrefects);
      console.log('Offenses:', window.prefectManager.offenses);
      console.log('Events:', window.prefectManager.events);
      console.log('General events:', window.prefectManager.generalEvents);
      console.log('House events:', window.prefectManager.houseEvents);
      console.log('Available grades:', window.prefectManager.getAvailableGrades());
      console.log('Available positions:', window.prefectManager.getAvailablePositions());
      console.log('Available classes:', window.prefectManager.getAvailableClasses());
    };

    window.testModal = prefectId => {
      if (prefectId) {
        window.prefectManager.showPrefectDetails(prefectId);
      } else {
        const firstPrefect = window.prefectManager.prefects[0];
        if (firstPrefect) {
          console.log('Testing modal with first prefect:', firstPrefect.PrefectID);
          window.prefectManager.showPrefectDetails(firstPrefect.PrefectID);
        } else {
          console.log('No prefects found for testing');
        }
      }
    };

    // Add utility functions to global scope
    window.searchByW0Number = w0number => {
      return window.prefectManager.searchPrefects(w0number, ['W0Number']);
    };

    window.searchByClass = className => {
      return window.prefectManager.searchPrefects(className, ['Class']);
    };

    window.exportPrefects = () => {
      window.prefectManager.exportToCSV();
    };

    window.refreshPrefects = () => {
      window.prefectManager.refreshData();
    };

    // Debug function to check event data
    window.debugEvents = () => {
      console.log('=== EVENT DEBUG INFO ===');
      console.log('General Events Master List:', window.prefectManager.generalEvents);
      console.log('House Events Master List:', window.prefectManager.houseEvents);
      console.log('Event Participation Data:', window.prefectManager.events);

      // Check if events have proper joins
      const sampleParticipation = window.prefectManager.events[0];
      if (sampleParticipation) {
        console.log('Sample participation record:', sampleParticipation);

        if (sampleParticipation.HouseEventsID) {
          const matchingHouseEvent = window.prefectManager.houseEvents.find(
            e => e.HouseEventID === sampleParticipation.HouseEventsID
          );
          console.log('Matching house event:', matchingHouseEvent);
        }

        if (sampleParticipation.GeneralEventID) {
          const matchingGeneralEvent = window.prefectManager.generalEvents.find(
            e => e.GeneralEventID === sampleParticipation.GeneralEventID
          );
          console.log('Matching general event:', matchingGeneralEvent);
        }
      }
    };

    console.log('Debug commands available:');
    console.log('- debugPrefects() - Show all debug info');
    console.log('- debugEvents() - Show event data and join issues');
    console.log('- testModal(prefectId) - Test modal popup');
    console.log('- searchByW0Number(w0number) - Search by W0Number');
    console.log('- searchByClass(className) - Search by class');
    console.log('- exportPrefects() - Export to CSV');
    console.log('- refreshPrefects() - Refresh data from server');
  } else {
    console.log('[PrefectManager] No house detected for current page:', currentPage);
  }
});
