/**
 * SIMPLIFIED Live Search System - Guaranteed to Work
 * File: prefect-search-filter.js
 */

let searchData = [];
let currentHouse = '';

// Detect house from URL
function detectHouse() {
  const url = window.location.pathname.toLowerCase();
  if (url.includes('aquila')) return 'Aquila';
  if (url.includes('cetus')) return 'Cetus';
  if (url.includes('cygnus')) return 'Cygnus';
  if (url.includes('ursa')) return 'Ursa';
  if (url.includes('central')) return 'Central';
  return 'Aquila';
}

// Create search results panel
function createSearchPanel() {
  const searchContainer = document.querySelector('.bg-div-background');
  if (!searchContainer || document.getElementById('searchResultsPanel')) return;

  const panel = document.createElement('div');
  panel.id = 'searchResultsPanel';
  panel.className =
    'hidden mt-5 bg-white rounded-xl border border-gray-200 shadow-xl max-h-[450px] overflow-y-auto';
  panel.innerHTML = `
        <div class="p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div class="flex items-center justify-between">
                <h4 class="text-base font-semibold text-gray-800">Search Results</h4>
                <span id="searchResultsCount" class="text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">0 results</span>
            </div>
        </div>
        <div id="searchResultsList">
            <!-- Results will be populated here -->
        </div>
    `;

  searchContainer.insertAdjacentElement('afterend', panel);
  console.log('✅ Search panel created');
}

// Load prefect data
async function loadPrefectData() {
  try {
    console.log('🔄 Loading data for house:', currentHouse);
    const response = await fetch(`/api/prefects/${currentHouse.toLowerCase()}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    searchData = await response.json();
    console.log('✅ Loaded', searchData.length, 'prefects');
    return true;
  } catch (error) {
    console.error('❌ Failed to load data:', error);
    searchData = [];
    return false;
  }
}

// Apply filters and search
function applyFilters() {
  const searchInput = document.getElementById('searchInput');
  const positionFilter = document.getElementById('positionFilter');
  const pointsFilter = document.getElementById('pointsFilter');

  const searchQuery = searchInput?.value?.toLowerCase() || '';
  const selectedPosition = positionFilter?.value || '';
  const selectedPoints = pointsFilter?.value || '';

  console.log('🔍 Applying filters:');
  console.log('  Search:', searchQuery);
  console.log('  Position:', selectedPosition);
  console.log('  Points:', selectedPoints);

  let filtered = [...searchData];

  // Search filter
  if (searchQuery.length >= 2) {
    filtered = filtered.filter(
      prefect =>
        prefect.FullName?.toLowerCase().includes(searchQuery) ||
        prefect.W0Number?.toLowerCase().includes(searchQuery) ||
        prefect.Class?.toLowerCase().includes(searchQuery) ||
        prefect.Position?.toLowerCase().includes(searchQuery)
    );
  }

  // Position filter
  if (selectedPosition) {
    console.log('🎯 Filtering by position:', selectedPosition);
    const beforeCount = filtered.length;
    filtered = filtered.filter(prefect => prefect.Position === selectedPosition);
    console.log(`  ${beforeCount} → ${filtered.length} after position filter`);
  }

  // Points filter
  if (selectedPoints) {
    console.log('📊 Filtering by points:', selectedPoints);
    const [min, max] = selectedPoints.split('-').map(Number);
    const beforeCount = filtered.length;
    filtered = filtered.filter(prefect => {
      const points = prefect.TotalPoints || 100;
      return points >= min && points <= max;
    });
    console.log(`  ${beforeCount} → ${filtered.length} after points filter`);
  }

  console.log('✅ Final results:', filtered.length);
  displayResults(filtered);

  // Show panel if we have filters active or search query
  if (searchQuery.length >= 2 || selectedPosition || selectedPoints) {
    showSearchPanel();
  } else {
    hideSearchPanel();
  }
}

// Display search results
function displayResults(results) {
  const resultsList = document.getElementById('searchResultsList');
  const resultsCount = document.getElementById('searchResultsCount');

  if (!resultsList || !resultsCount) return;

  resultsCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
  resultsList.innerHTML = '';

  if (results.length === 0) {
    resultsList.innerHTML = `
            <div class="p-6 text-center text-gray-500">
                <div class="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </div>
                <p class="text-base font-medium">No prefects found</p>
                <p class="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
            </div>
        `;
    return;
  }

  results.forEach((prefect, index) => {
    const points = prefect.TotalPoints || 100;
    const pointsClass =
      points >= 90
        ? 'bg-green-100 text-green-800'
        : points >= 80
          ? 'bg-yellow-100 text-yellow-800'
          : points >= 70
            ? 'bg-orange-100 text-orange-800'
            : 'bg-red-100 text-red-800';

    const resultItem = document.createElement('div');
    resultItem.className =
      'p-5 border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 cursor-pointer';
    resultItem.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <div class="flex items-center space-x-3">
                        <div class="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-md">
                            <span class="text-lg font-bold text-white">${prefect.FullName?.charAt(0) || '?'}</span>
                        </div>
                        <div class="flex-1">
                            <h3 class="text-lg font-semibold text-gray-900 mb-1">${prefect.FullName || 'Unknown'}</h3>
                            <div class="flex items-center space-x-3 text-sm text-gray-600 mb-1">
                                <span class="flex items-center">
                                    <svg class="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-4 0v2m0 0h4"></path>
                                    </svg>
                                    ${prefect.W0Number || 'N/A'}
                                </span>
                                <span class="flex items-center">
                                    <svg class="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                    </svg>
                                    ${prefect.Class || 'N/A'}
                                </span>

                            </div>
                            <div class="flex items-center">
                                <span class="inline-flex items-center px-2 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-800">
                                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                    </svg>
                                    ${prefect.Position || 'No position'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ml-4">
                    <button onclick="locatePrefect('${prefect.PrefectID}', '${prefect.Position}')" 
                            class="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        <span>Locate</span>
                    </button>
                </div>
            </div>
        `;
    resultsList.appendChild(resultItem);
  });
}

// Show/hide search panel
function showSearchPanel() {
  const panel = document.getElementById('searchResultsPanel');
  if (panel) {
    panel.classList.remove('hidden');
    console.log('📱 Search panel shown');
  }
}

function hideSearchPanel() {
  const panel = document.getElementById('searchResultsPanel');
  if (panel) {
    panel.classList.add('hidden');
    console.log('📱 Search panel hidden');
  }
}

// Clear all filters
function clearAllFilters() {
  const searchInput = document.getElementById('searchInput');
  const positionFilter = document.getElementById('positionFilter');
  const pointsFilter = document.getElementById('pointsFilter');

  if (searchInput) searchInput.value = '';
  if (positionFilter) positionFilter.value = '';
  if (pointsFilter) pointsFilter.value = '';

  hideSearchPanel();
  console.log('🧹 All filters cleared');
}

// Locate prefect in table
function locatePrefect(prefectId, position) {
  console.log('🎯 Locating prefect:', prefectId, position);

  // Hide search panel
  hideSearchPanel();

  // Find the correct table
  const tableId = getTableIdForPosition(position);
  const table = document.getElementById(tableId);

  if (!table) {
    console.error('❌ Table not found:', tableId);
    return;
  }

  // Find the row
  const rows = table.querySelectorAll('tbody tr');
  let targetRow = null;

  for (const row of rows) {
    if (row.textContent.includes(prefectId) || row.innerHTML.includes(prefectId)) {
      targetRow = row;
      break;
    }
  }

  if (!targetRow) {
    console.error('❌ Row not found for prefect:', prefectId);
    return;
  }

  // Clear existing highlights
  document.querySelectorAll('.prefect-highlight').forEach(el => {
    el.classList.remove('prefect-highlight', 'animate-pulse');
  });

  // Scroll to center and highlight
  const rect = targetRow.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const targetY = window.pageYOffset + rect.top - viewportHeight / 2 + rect.height / 2;

  window.scrollTo({
    top: Math.max(0, targetY),
    behavior: 'smooth',
  });

  // Highlight after scroll
  setTimeout(() => {
    targetRow.classList.add('prefect-highlight', 'animate-pulse');
    showNotification(`Found in ${position} section`);

    // Remove pulse after 3 seconds
    setTimeout(() => {
      targetRow.classList.remove('animate-pulse');
    }, 3000);

    // Remove highlight after 10 seconds
    setTimeout(() => {
      targetRow.classList.remove('prefect-highlight');
    }, 10000);
  }, 800);
}

// Get table ID for position
function getTableIdForPosition(position) {
  const positionMap = {
    'House Captain': `${currentHouse}HouseCaptain`,
    'Deputy House Captain': `${currentHouse}DeputyHouseCaptain`,
    'House Games Captain': `${currentHouse}HouseGamesCaptain`,
    'Deputy House Games Captain': `${currentHouse}DeputyHouseGamesCaptain`,
    Prefect: `${currentHouse}Prefects`,
    Prefects: `${currentHouse}Prefects`,
    'House Prefects': `${currentHouse}HousePrefects`,
    'Prefect Interns': `${currentHouse}PrefectInterns`, // NEW: Add this line
    'Head Prefect': 'HPTable',
    'Deputy Head Prefect': 'DHPTable',
    'Games Captain': 'GCTable',
    'Deputy Games Captain': 'DGCTable',
  };

  return positionMap[position] || `${currentHouse}Prefects`;
}

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className =
    'fixed top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 transform translate-x-full transition-transform duration-300';
  notification.innerHTML = `
        <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
            </div>
            <span class="font-semibold">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200 text-xl font-bold">×</button>
        </div>
    `;

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);

  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }
  }, 3000);
}

// Add view details function
function viewDetails(prefectId) {
  console.log('👁️ Viewing details for:', prefectId);
  showNotification(`Opening details for ${prefectId}`);
  // You can add modal or navigation logic here
}

// Make the function available globally
window.viewDetails = viewDetails;

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Initialize everything
async function initializeSearch() {
  console.log('🚀 Initializing Simple Search System...');

  // Detect current house
  currentHouse = detectHouse();
  console.log('🏠 Current house:', currentHouse);

  // Create search panel
  createSearchPanel();

  // Load data
  const dataLoaded = await loadPrefectData();
  if (!dataLoaded) {
    console.error('❌ Failed to load data, search will not work');
    return;
  }

  // Set up event listeners
  const searchInput = document.getElementById('searchInput');
  const positionFilter = document.getElementById('positionFilter');
  const pointsFilter = document.getElementById('pointsFilter');
  const clearButton = document.getElementById('clearSearch');

  if (searchInput) {
    console.log('🔗 Search input found, binding events');
    const debouncedFilter = debounce(applyFilters, 300);
    searchInput.addEventListener('input', debouncedFilter);
  }

  if (positionFilter) {
    console.log('🔗 Position filter found, binding events');
    console.log(
      '  Options:',
      Array.from(positionFilter.options).map(o => o.value)
    );
    positionFilter.addEventListener('change', () => {
      console.log('🎯 Position changed to:', positionFilter.value);
      applyFilters();
    });
  }

  if (pointsFilter) {
    console.log('🔗 Points filter found, binding events');
    console.log(
      '  Options:',
      Array.from(pointsFilter.options).map(o => o.value)
    );
    pointsFilter.addEventListener('change', () => {
      console.log('📊 Points changed to:', pointsFilter.value);
      applyFilters();
    });
  }

  if (clearButton) {
    console.log('🔗 Clear button found, binding events');
    clearButton.addEventListener('click', clearAllFilters);
  }

  console.log('✅ Search system initialized successfully!');

  // Test function for manual debugging
  window.testFilters = () => {
    console.log('🧪 MANUAL TEST');
    console.log('Search data length:', searchData.length);
    console.log('Position filter value:', positionFilter?.value);
    console.log('Points filter value:', pointsFilter?.value);
    applyFilters();
  };
}

// Add CSS for highlighting
const style = document.createElement('style');
style.textContent = `
    .prefect-highlight {
        background: linear-gradient(90deg, #fef3c7, #fde68a) !important;
        border: 3px solid #f59e0b !important;
        border-radius: 12px !important;
        box-shadow: 0 0 30px rgba(245, 158, 11, 0.6) !important;
        transform: scale(1.03) !important;
        transition: all 0.3s ease !important;
        z-index: 10 !important;
        position: relative !important;
    }
    
    .prefect-highlight.animate-pulse {
        animation: enhanced-pulse 1.5s infinite;
    }
    
    @keyframes enhanced-pulse {
        0%, 100% { 
            box-shadow: 0 0 30px rgba(245, 158, 11, 0.6);
            transform: scale(1.03);
        }
        50% { 
            box-shadow: 0 0 40px rgba(245, 158, 11, 0.9);
            transform: scale(1.04);
        }
    }
    
    #searchResultsPanel {
        animation: slideDown 0.3s ease-out;
    }
    
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }
    
    .search-result-item:hover {
        transform: translateY(-2px);
    }
`;
document.head.appendChild(style);

// Wait for DOM and initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSearch);
} else {
  initializeSearch();
}

// Global function for external use
window.locatePrefect = locatePrefect;
