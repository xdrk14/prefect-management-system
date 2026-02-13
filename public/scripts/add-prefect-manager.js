/**
 * COMPLETE ADD NEW PREFECT SYSTEM - FIXED VERSION
 * Add this to your prefect-table-manager.js file or create a new file: add-prefect-manager.js
 */

// Extend PrefectTableManager with Add New Prefect functionality
Object.assign(PrefectTableManager.prototype, {
  // Initialize Add New Prefect functionality
  initAddPrefectManager() {
    this.debugLog('Initializing Add New Prefect Manager');
    this.createAddPrefectModal();
    this.addNewPrefectButton();
    this.bindAddPrefectEvents();
  },

  // Add "Add New Prefect" button to the page
  addNewPrefectButton() {
    // Find the best place to add the button (adjust if needed)
    const targetContainer =
      document.querySelector('.search-controls') ||
      document.querySelector('main') ||
      document.querySelector('.container') ||
      document.body;

    const buttonHTML = `
            <div class="add-prefect-container mb-6 text-center">
                <button id="addNewPrefectBtn" class="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-all duration-200 transform hover:scale-105 hover:shadow-xl">
                    <svg class="w-6 h-6 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Add New Prefect to ${this.house}
                </button>
            </div>
        `;

    targetContainer.insertAdjacentHTML('afterbegin', buttonHTML);
  },

  // Get event options for select dropdowns
  getEventOptions(type) {
    const events = type === 'general' ? this.generalEvents : this.houseEvents;
    if (!events || events.length === 0) {
      return '<option value="">No events available</option>';
    }

    const idField = type === 'general' ? 'GeneralEventID' : 'HouseEventID';
    const nameField = type === 'general' ? 'GeneralEventName' : 'HouseEventName';

    return events
      .map(
        event =>
          `<option value="${event[idField]}">${event[nameField]} (${this.formatDate(event.EventDateHeld)})</option>`
      )
      .join('');
  },

  // Get position options for new prefect
  getNewPrefectPositionOptions() {
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
          ]; // Added Prefect Interns

    return positions.map(pos => `<option value="${pos}">${pos}</option>`).join('');
  },

  // Create Add New Prefect modal
  createAddPrefectModal() {
    const addModalHTML = `
            <div id="addPrefectModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-lg max-w-5xl w-full max-h-screen overflow-y-auto">
                    <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
                        <h2 class="text-2xl font-bold text-gray-900">Add New Prefect to ${this.house}</h2>
                        <div class="flex space-x-2">
                            <button id="addPrefectSaveBtn" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded transition-colors duration-200 font-semibold">
                                Add Prefect
                            </button>
                            <button id="closeAddPrefectModal" class="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        <!-- Main Prefect Information -->
                        <div class="bg-blue-50 rounded-lg p-6 mb-6 border border-blue-200">
                            <h3 class="text-xl font-bold mb-4 text-gray-900 flex items-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                                New Prefect Information
                            </h3>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Prefect ID *</label>
                                    <input type="text" id="newPrefectID" placeholder="e.g., HP001" 
                                           class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                                    <p class="text-xs text-gray-500 mt-1">Must be unique for this house</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">W0 Number *</label>
                                    <input type="text" id="newW0Number" placeholder="e.g., W00001" 
                                           class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                                    <p class="text-xs text-gray-500 mt-1">Format: W00000 (5 digits)</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input type="text" id="newFullName" placeholder="e.g., John Smith" 
                                           class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                                    <select id="newPosition" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                                        <option value="">Select Position...</option>
                                        ${this.getNewPrefectPositionOptions()}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                                    <input type="date" id="newDateOfBirth" 
                                           class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                                    <input type="text" id="newClass" placeholder="e.g., 11 Sci A" 
                                           class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                                    <p class="text-xs text-gray-500 mt-1">Format: Grade Subject Section</p>
                                </div>
                            </div>
                            
                            <!-- ID Generation Helper -->
                            <div class="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <h4 class="font-semibold text-gray-800 mb-2">ID Generation Helper</h4>
                                <p class="text-sm text-gray-600 mb-3">Click below to auto-generate IDs based on house and position:</p>
                                <div class="flex space-x-2">
                                    <button type="button" id="generatePrefectIDBtn" 
                                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
                                        Generate Prefect ID
                                    </button>
                                    <button type="button" id="generateW0NumberBtn" 
                                            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm">
                                        Generate W0 Number
                                    </button>
                                </div>
                            </div>
                            
                            <!-- W0 Number Ranges Info -->
                            <div class="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                <h4 class="font-semibold text-yellow-800 mb-2">W0 Number Ranges</h4>
                                <div class="text-sm text-yellow-700 grid grid-cols-2 gap-2">
                                    <div>• Central: W00001 - W00011</div>
                                    <div>• Aquila: W00100 - W00199</div>
                                    <div>• Cetus: W00200 - W00299</div>
                                    <div>• Cygnus: W00300 - W00399</div>
                                    <div>• Ursa: W00400 - W00499</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Optional: Add Initial Events Section -->
                        <div class="bg-green-50 rounded-lg p-6 border border-green-200">
                            <h3 class="text-xl font-bold mb-4 text-gray-900 flex items-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                Add Initial Events (Optional)
                            </h3>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">General Events</label>
                                    <select id="newPrefectGeneralEvents" multiple size="4" 
                                            class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                        ${this.getEventOptions('general')}
                                    </select>
                                    <p class="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">House Events</label>
                                    <select id="newPrefectHouseEvents" multiple size="4" 
                                            class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                        ${this.getEventOptions('house')}
                                    </select>
                                    <p class="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML('beforeend', addModalHTML);
  },

  // Bind all Add Prefect events
  bindAddPrefectEvents() {
    // Button events
    document
      .getElementById('addNewPrefectBtn')
      .addEventListener('click', () => this.showAddPrefectModal());
    document
      .getElementById('closeAddPrefectModal')
      .addEventListener('click', () => this.closeAddPrefectModal());
    document
      .getElementById('addPrefectSaveBtn')
      .addEventListener('click', () => this.addNewPrefect());

    // Generator buttons
    document
      .getElementById('generatePrefectIDBtn')
      .addEventListener('click', () => this.generatePrefectID());
    document
      .getElementById('generateW0NumberBtn')
      .addEventListener('click', () => this.generateW0Number());

    // Form validation
    document
      .getElementById('newPrefectID')
      .addEventListener('input', this.validateNewPrefectID.bind(this));
    document
      .getElementById('newW0Number')
      .addEventListener('input', this.validateNewW0Number.bind(this));
    document.getElementById('newClass').addEventListener('input', this.validateNewClass.bind(this));

    // Close modal with Escape key
    document.addEventListener('keydown', e => {
      if (
        e.key === 'Escape' &&
        !document.getElementById('addPrefectModal').classList.contains('hidden')
      ) {
        this.closeAddPrefectModal();
      }
    });
  },

  // Show Add Prefect Modal
  showAddPrefectModal() {
    this.debugLog('Opening Add New Prefect modal');
    document.getElementById('addPrefectModal').classList.remove('hidden');
    this.clearAddPrefectForm();
  },

  // Close Add Prefect Modal
  closeAddPrefectModal() {
    document.getElementById('addPrefectModal').classList.add('hidden');
    this.clearAddPrefectForm();
  },

  // Clear Add Prefect Form
  clearAddPrefectForm() {
    document.getElementById('newPrefectID').value = '';
    document.getElementById('newW0Number').value = '';
    document.getElementById('newFullName').value = '';
    document.getElementById('newPosition').value = '';
    document.getElementById('newDateOfBirth').value = '';
    document.getElementById('newClass').value = '';
    document.getElementById('newPrefectGeneralEvents').selectedIndex = -1;
    document.getElementById('newPrefectHouseEvents').selectedIndex = -1;

    // Clear validation errors
    document.querySelectorAll('.validation-error').forEach(el => el.remove());
    document
      .querySelectorAll('.border-red-500')
      .forEach(el => el.classList.remove('border-red-500'));
  },

  // Generate Prefect ID based on house and position
  generatePrefectID() {
    const position = document.getElementById('newPosition').value;
    if (!position) {
      this.showErrorMessage('Please select a position first');
      return;
    }

    // Get existing prefect IDs to find next available number
    const existingIds = this.prefects.map(p => p.PrefectID);

    let prefix = '';
    if (this.house === 'Central') {
      const prefixMap = {
        'Head Prefect': 'HP',
        'Deputy Head Prefect': 'DHP',
        'Games Captain': 'GC',
        'Deputy Games Captain': 'DGC',
      };
      prefix = prefixMap[position];
    } else {
      const housePrefixes = {
        Aquila: 'AQ',
        Cetus: 'CE',
        Cygnus: 'CY',
        Ursa: 'U',
      };
      const positionPrefixes = {
        'House Captain': 'HC',
        'Deputy House Captain': 'DHC',
        'House Games Captain': 'HGC',
        'Deputy House Games Captain': 'DHGC',
        Prefects: 'P',
        'House Prefects': 'HP',
        'Prefect Interns': 'PI', // NEW: Add Prefect Interns prefix
      };
      prefix = housePrefixes[this.house] + positionPrefixes[position];
    }

    // Find next available number
    let counter = 1;
    let newId;
    do {
      newId = `${prefix}-${counter.toString().padStart(3, '0')}`;
      counter++;
    } while (existingIds.includes(newId) && counter < 1000);

    document.getElementById('newPrefectID').value = newId;
    this.showSuccessMessage(`Generated Prefect ID: ${newId}`);
  },

  // Generate W0 Number based on house
  async generateW0Number() {
    try {
      // Get existing W0Numbers from server
      const response = await fetch('/api/utility/w0numbers-in-use');
      const allW0Numbers = await response.json();

      // Flatten all W0Numbers from all houses
      const usedNumbers = Object.values(allW0Numbers)
        .flat()
        .map(item => item.W0Number)
        .filter(Boolean);

      // Define ranges for each house
      const ranges = {
        Central: { start: 1, end: 11 },
        Aquila: { start: 100, end: 199 },
        Cetus: { start: 200, end: 299 },
        Cygnus: { start: 300, end: 399 },
        Ursa: { start: 400, end: 499 },
      };

      const range = ranges[this.house];
      if (!range) {
        throw new Error('Invalid house for W0Number generation');
      }

      // Find next available number in range
      let newNumber;
      for (let i = range.start; i <= range.end; i++) {
        const w0Number = `W${i.toString().padStart(5, '0')}`;
        if (!usedNumbers.includes(w0Number)) {
          newNumber = w0Number;
          break;
        }
      }

      if (!newNumber) {
        throw new Error(`No available W0Numbers in range for ${this.house}`);
      }

      document.getElementById('newW0Number').value = newNumber;
      this.showSuccessMessage(`Generated W0Number: ${newNumber}`);
    } catch (error) {
      console.error('Error generating W0Number:', error);
      this.showErrorMessage(error.message);
    }
  },

  // Validate new prefect ID
  validateNewPrefectID(event) {
    const value = event.target.value;
    const existingIds = this.prefects.map(p => p.PrefectID);

    if (value && existingIds.includes(value)) {
      event.target.classList.add('border-red-500');
      this.showValidationError(event.target, 'This Prefect ID already exists');
    } else {
      event.target.classList.remove('border-red-500');
      this.hideValidationError(event.target);
    }
  },

  // Validate new W0 number
  validateNewW0Number(event) {
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

  // Validate new class
  validateNewClass(event) {
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

  // Show success message
  showSuccessMessage(message) {
    // Use existing method if available, otherwise create new one
    if (typeof this.showSuccess === 'function') {
      this.showSuccess(message);
      return;
    }

    const successDiv = document.createElement('div');
    successDiv.className =
      'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
    successDiv.innerHTML = `
            <div class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                ${message}
            </div>
        `;
    document.body.appendChild(successDiv);

    setTimeout(() => successDiv.remove(), 4000);
  },

  // Show error message
  showErrorMessage(message) {
    // Use existing method if available, otherwise create new one
    if (typeof this.showError === 'function') {
      this.showError(message);
      return;
    }

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

    setTimeout(() => errorDiv.remove(), 5000);
  },

  // Add new prefect
  async addNewPrefect() {
    this.debugLog('Adding new prefect');

    const saveBtn = document.getElementById('addPrefectSaveBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Adding...';
    saveBtn.disabled = true;

    try {
      // Collect form data
      const formData = {
        PrefectID: document.getElementById('newPrefectID').value,
        W0Number: document.getElementById('newW0Number').value,
        FullName: document.getElementById('newFullName').value,
        Position: document.getElementById('newPosition').value,
        DateOfBirth: document.getElementById('newDateOfBirth').value,
        Class: document.getElementById('newClass').value,
      };

      // Validate required fields
      const requiredFields = [
        'PrefectID',
        'W0Number',
        'FullName',
        'Position',
        'DateOfBirth',
        'Class',
      ];
      const missingFields = requiredFields.filter(field => !formData[field]);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate uniqueness
      const existingIds = this.prefects.map(p => p.PrefectID);
      if (existingIds.includes(formData.PrefectID)) {
        throw new Error('Prefect ID already exists');
      }

      // Add prefect
      const response = await fetch(`/api/prefects/${this.house}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add prefect');
      }

      // Add selected events if any
      await this.addInitialEvents(formData.PrefectID);

      // Refresh data and close modal
      await this.refreshData();
      try {
        if (window.auditLog) {
          await window.auditLog.logActivity(
            'prefect_created',
            `New prefect added: ${formData.FullName}`,
            {
              prefectId: formData.PrefectID,
              house: this.house,
              position: formData.Position,
              w0Number: formData.W0Number,
              class: formData.Class,
              status: 'success',
            }
          );
          console.log('✅ Prefect creation logged to audit');
        }
      } catch (auditError) {
        console.log('⚠️ Failed to log prefect creation:', auditError);
      }
      this.closeAddPrefectModal();
      this.showSuccessMessage(`${formData.FullName} has been added successfully to ${this.house}!`);
    } catch (error) {
      console.error('Error adding prefect:', error);
      this.showErrorMessage(error.message);
    } finally {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }
  },

  // Add initial events to new prefect
  async addInitialEvents(prefectId) {
    try {
      const generalEvents = Array.from(
        document.getElementById('newPrefectGeneralEvents').selectedOptions
      ).map(option => option.value);
      const houseEvents = Array.from(
        document.getElementById('newPrefectHouseEvents').selectedOptions
      ).map(option => option.value);

      // Add general events
      for (const eventId of generalEvents) {
        await fetch(`/api/events-participation/${this.house}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            PrefectID: prefectId,
            GeneralEventID: eventId,
          }),
        });
      }

      // Add house events
      for (const eventId of houseEvents) {
        await fetch(`/api/events-participation/${this.house}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            PrefectID: prefectId,
            HouseEventsID: eventId,
          }),
        });
      }
    } catch (error) {
      console.error('Error adding initial events:', error);
      // Don't throw error as prefect was successfully created
    }
  },
});

// Initialize Add Prefect Manager when the main system loads
const originalInit = PrefectTableManager.prototype.init;
PrefectTableManager.prototype.init = async function () {
  await originalInit.call(this);
  this.initAddPrefectManager();
};

console.log('[SUCCESS] Add New Prefect Manager loaded successfully!');
