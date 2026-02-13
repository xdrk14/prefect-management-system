/**
 * Search Enhancement Features
 * Additional utilities and keyboard shortcuts for the live search system
 * File: advanced-search-utils.js
 */

class SearchEnhancements {
  constructor(searchInstance) {
    this.searchInstance = searchInstance;
    this.init();
  }

  init() {
    this.setupKeyboardShortcuts();
    this.setupQuickActions();
    this.setupSearchHistory();
  }

  /**
   * Setup keyboard shortcuts for better UX
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      // Ctrl/Cmd + F: Focus search box
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // Ctrl/Cmd + K: Quick search (modern UX)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // Arrow keys for navigating search results
      if (this.searchInstance.isSearchActive) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.navigateResults('down');
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.navigateResults('up');
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.selectCurrentResult();
        }
      }

      // Escape: Clear search and close results
      if (e.key === 'Escape') {
        if (this.searchInstance.isSearchActive) {
          this.searchInstance.clearSearch();
        }
      }
    });
  }

  /**
   * Navigate through search results with keyboard
   */
  navigateResults(direction) {
    const resultItems = document.querySelectorAll('#searchResultsList > div');
    if (resultItems.length === 0) return;

    let currentIndex = this.getCurrentSelectedIndex();

    if (direction === 'down') {
      currentIndex = currentIndex < resultItems.length - 1 ? currentIndex + 1 : 0;
    } else {
      currentIndex = currentIndex > 0 ? currentIndex - 1 : resultItems.length - 1;
    }

    this.highlightResultItem(currentIndex);
  }

  /**
   * Get currently selected result index
   */
  getCurrentSelectedIndex() {
    const resultItems = document.querySelectorAll('#searchResultsList > div');
    for (let i = 0; i < resultItems.length; i++) {
      if (resultItems[i].classList.contains('bg-blue-50')) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Highlight a specific result item
   */
  highlightResultItem(index) {
    const resultItems = document.querySelectorAll('#searchResultsList > div');

    // Remove existing highlights
    resultItems.forEach(item => {
      item.classList.remove('bg-blue-50', 'border-blue-200');
    });

    // Highlight selected item
    if (resultItems[index]) {
      resultItems[index].classList.add('bg-blue-50', 'border-blue-200');
      resultItems[index].scrollIntoView({ block: 'nearest' });
    }
  }

  /**
   * Select the currently highlighted result
   */
  selectCurrentResult() {
    const currentIndex = this.getCurrentSelectedIndex();
    if (currentIndex >= 0 && this.searchInstance.searchResults[currentIndex]) {
      const prefect = this.searchInstance.searchResults[currentIndex];
      window.locatePrefect(prefect.PrefectID, prefect.Position, currentIndex);
    }
  }

  /**
   * Setup quick action buttons
   */
  setupQuickActions() {
    this.createQuickActionBar();
  }

  /**
   * Create quick action bar below search
   */
  createQuickActionBar() {
    const searchContainer = document.querySelector('.bg-div-background');
    if (!searchContainer) return;

    const quickActions = document.createElement('div');
    quickActions.id = 'quickActionBar';
    quickActions.className = 'mt-3 flex flex-wrap gap-2';

    quickActions.innerHTML = `
            <button onclick="quickSearch('House Captain')" 
                    class="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full hover:bg-blue-200 transition-colors duration-200">
                House Captains
            </button>
            <button onclick="quickSearch('Prefect')" 
                    class="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full hover:bg-green-200 transition-colors duration-200">
                Prefects
            </button>
            <button onclick="quickSearchGrade('11')" 
                    class="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full hover:bg-purple-200 transition-colors duration-200">
                Grade 11
            </button>
            <button onclick="quickSearchGrade('12')" 
                    class="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full hover:bg-purple-200 transition-colors duration-200">
                Grade 12
            </button>
            <button onclick="showSearchTips()" 
                    class="px-3 py-1 bg-gray-100 text-gray-800 text-xs rounded-full hover:bg-gray-200 transition-colors duration-200">
                Search Tips
            </button>
        `;

    searchContainer.appendChild(quickActions);
  }

  /**
   * Setup search history
   */
  setupSearchHistory() {
    this.searchHistory = this.loadSearchHistory();
    this.setupHistoryDropdown();
  }

  /**
   * Load search history from localStorage
   */
  loadSearchHistory() {
    try {
      const history = localStorage.getItem(
        `prefect_search_history_${this.searchInstance.currentHouse}`
      );
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save search to history
   */
  saveSearchToHistory(query) {
    if (!query || query.length < 2) return;

    // Remove if already exists
    this.searchHistory = this.searchHistory.filter(item => item !== query);

    // Add to beginning
    this.searchHistory.unshift(query);

    // Keep only last 10 searches
    this.searchHistory = this.searchHistory.slice(0, 10);

    // Save to localStorage
    try {
      localStorage.setItem(
        `prefect_search_history_${this.searchInstance.currentHouse}`,
        JSON.stringify(this.searchHistory)
      );
    } catch (error) {
      console.warn('Could not save search history:', error);
    }
  }

  /**
   * Setup history dropdown
   */
  setupHistoryDropdown() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    // Add history icon to search input
    const searchContainer = searchInput.parentElement;
    const historyButton = document.createElement('button');
    historyButton.className =
      'absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600';
    historyButton.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        `;

    // Make search container relative if not already
    if (getComputedStyle(searchContainer).position === 'static') {
      searchContainer.style.position = 'relative';
    }

    searchContainer.appendChild(historyButton);

    // Show history on click
    historyButton.addEventListener('click', e => {
      e.preventDefault();
      this.showSearchHistory();
    });
  }

  /**
   * Show search history dropdown
   */
  showSearchHistory() {
    if (this.searchHistory.length === 0) {
      this.showNotification('No search history available', 'info');
      return;
    }

    // Remove existing dropdown
    const existingDropdown = document.getElementById('searchHistoryDropdown');
    if (existingDropdown) {
      existingDropdown.remove();
    }

    const searchInput = document.getElementById('searchInput');
    const dropdown = document.createElement('div');
    dropdown.id = 'searchHistoryDropdown';
    dropdown.className =
      'absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-40 overflow-y-auto';

    dropdown.innerHTML = `
            <div class="p-2 border-b border-gray-200">
                <span class="text-xs font-medium text-gray-700">Recent Searches</span>
            </div>
            ${this.searchHistory
              .map(
                query => `
                <button onclick="useHistorySearch('${query}')" 
                        class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors duration-200 flex items-center justify-between">
                    <span>${query}</span>
                    <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
            `
              )
              .join('')}
            <div class="p-2 border-t border-gray-200">
                <button onclick="clearSearchHistory()" 
                        class="w-full text-left text-xs text-red-600 hover:text-red-800">
                    Clear History
                </button>
            </div>
        `;

    searchInput.parentElement.appendChild(dropdown);

    // Close dropdown when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function closeDropdown(e) {
        if (!e.target.closest('#searchHistoryDropdown') && !e.target.closest('button')) {
          dropdown.remove();
          document.removeEventListener('click', closeDropdown);
        }
      });
    }, 100);
  }

  /**
   * Show notification message
   */
  showNotification(message, type = 'success') {
    const colors = {
      success: 'bg-green-600',
      error: 'bg-red-600',
      info: 'bg-blue-600',
      warning: 'bg-yellow-600',
    };

    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300`;
    notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">×</button>
            </div>
        `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 300);
    }, 3000);
  }
}

// Global quick search functions - FIXED
window.quickSearch = function (position) {
  console.log('Quick search for position:', position);

  const searchInput = document.getElementById('searchInput');
  const positionFilter = document.getElementById('positionFilter');

  // Clear search input
  if (searchInput) {
    searchInput.value = '';
  }

  // Set position filter
  if (positionFilter) {
    positionFilter.value = position;
    console.log('Position filter set to:', positionFilter.value);

    // Manually trigger the filter change
    if (window.livePrefectSearch) {
      window.livePrefectSearch.handleFilterChange();
    }
  }
};

window.quickSearchGrade = function (grade) {
  console.log('Quick search for grade:', grade);

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = grade;
    searchInput.focus();

    // Manually trigger the search
    if (window.livePrefectSearch) {
      window.livePrefectSearch.handleSearch(grade);
    }
  }
};

window.useHistorySearch = function (query) {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = query;

    if (window.livePrefectSearch) {
      window.livePrefectSearch.handleSearch(query);
    }
  }

  // Close dropdown
  const dropdown = document.getElementById('searchHistoryDropdown');
  if (dropdown) dropdown.remove();
};

window.clearSearchHistory = function () {
  if (window.searchEnhancements && window.searchEnhancements.searchInstance) {
    const house = window.searchEnhancements.searchInstance.currentHouse;
    try {
      localStorage.removeItem(`prefect_search_history_${house}`);
      window.searchEnhancements.searchHistory = [];
      window.searchEnhancements.showNotification('Search history cleared', 'info');
    } catch (error) {
      console.warn('Could not clear search history:', error);
    }
  }

  // Close dropdown
  const dropdown = document.getElementById('searchHistoryDropdown');
  if (dropdown) dropdown.remove();
};

window.showSearchTips = function () {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Search Tips</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
                </div>
                <div class="space-y-3">
                    <div class="bg-blue-50 p-3 rounded-lg">
                        <h4 class="font-medium text-blue-900 mb-1">Keyboard Shortcuts</h4>
                        <ul class="text-sm text-blue-800 space-y-1">
                            <li><kbd class="px-2 py-1 bg-blue-200 rounded text-xs">Ctrl+F</kbd> Focus search box</li>
                            <li><kbd class="px-2 py-1 bg-blue-200 rounded text-xs">↑↓</kbd> Navigate results</li>
                            <li><kbd class="px-2 py-1 bg-blue-200 rounded text-xs">Enter</kbd> Locate selected</li>
                            <li><kbd class="px-2 py-1 bg-blue-200 rounded text-xs">Esc</kbd> Clear search</li>
                        </ul>
                    </div>
                    <div class="bg-green-50 p-3 rounded-lg">
                        <h4 class="font-medium text-green-900 mb-1">Search Examples</h4>
                        <ul class="text-sm text-green-800 space-y-1">
                            <li><strong>"John"</strong> - Find by name</li>
                            <li><strong>"W00123"</strong> - Find by W0 number</li>
                            <li><strong>"11 Sci A"</strong> - Find by class</li>
                            <li><strong>"Captain"</strong> - Find by position</li>
                        </ul>
                    </div>
                    <div class="bg-purple-50 p-3 rounded-lg">
                        <h4 class="font-medium text-purple-900 mb-1">Pro Tips</h4>
                        <ul class="text-sm text-purple-800 space-y-1">
                            <li>• Use filters for refined searches</li>
                            <li>• Click "Locate" to find in tables</li>
                            <li>• Recent searches are saved</li>
                            <li>• Search works across all fields</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;

  document.body.appendChild(modal);
};

// Enhanced search input behavior
document.addEventListener('DOMContentLoaded', () => {
  // Wait for main search to initialize
  setTimeout(() => {
    if (window.livePrefectSearch) {
      window.searchEnhancements = new SearchEnhancements(window.livePrefectSearch);

      // Hook into search input to save history
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        let lastSearch = '';
        searchInput.addEventListener('input', e => {
          const query = e.target.value;
          if (query.length >= 2 && query !== lastSearch) {
            lastSearch = query;
            setTimeout(() => {
              if (searchInput.value === query) {
                window.searchEnhancements.saveSearchToHistory(query);
              }
            }, 2000); // Save after 2 seconds of no changes
          }
        });
      }
    }
  }, 1500);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchEnhancements;
}
