// utils/navigation-utils.js - Fixed Navigation and mobile menu utilities

console.log('[CLEAN] Navigation Utils Loading...');

// Check if screen is mobile/tablet size (1024px or smaller)
function isMobileScreen() {
  return window.innerWidth <= 1024; // Fixed: was 1025, should be 1024 to match media query
}

// Mobile Menu Toggle - Fixed version
function initializeMobileMenu() {
  console.log('[INFO] Initializing custom mobile menu...');

  // Find our custom hamburger and mobile menu
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.nav-menu');
  const desktopNav = document.querySelector('.desktop-nav');

  // Also handle legacy Tailwind elements (disable them)
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const legacyMobileMenu = document.getElementById('mobile-menu');

  console.log('Found elements:', {
    hamburger: !!hamburger,
    mobileMenu: !!mobileMenu,
    desktopNav: !!desktopNav,
    legacyButton: !!mobileMenuButton,
    legacyMenu: !!legacyMobileMenu,
  });

  // Disable legacy Tailwind navigation
  if (mobileMenuButton) {
    mobileMenuButton.style.display = 'none';
    mobileMenuButton.disabled = true;
  }
  if (legacyMobileMenu) {
    legacyMobileMenu.style.display = 'none';
  }

  // Setup custom hamburger menu
  if (hamburger && mobileMenu) {
    // Clear any existing event listeners by cloning the node
    const newHamburger = hamburger.cloneNode(true);
    hamburger.parentNode.replaceChild(newHamburger, hamburger);

    // Add click handler to hamburger
    newHamburger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      console.log('[INFO] Hamburger clicked, screen:', window.innerWidth);

      if (isMobileScreen()) {
        const isActive = mobileMenu.classList.contains('active');
        console.log('Menu currently active:', isActive);

        if (isActive) {
          // Close menu
          mobileMenu.classList.remove('active');
          newHamburger.classList.remove('active');
          document.body.classList.remove('menu-open'); // Prevent body scroll
          console.log('[SUCCESS] Menu closed');
        } else {
          // Open menu
          mobileMenu.classList.add('active');
          newHamburger.classList.add('active');
          document.body.classList.add('menu-open'); // Prevent body scroll
          console.log('[SUCCESS] Menu opened');
        }
      }
    });

    // Close menu when clicking nav links
    const navLinks = mobileMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      // Remove existing listeners
      const newLink = link.cloneNode(true);
      link.parentNode.replaceChild(newLink, link);

      newLink.addEventListener('click', function () {
        if (isMobileScreen()) {
          mobileMenu.classList.remove('active');
          newHamburger.classList.remove('active');
          document.body.classList.remove('menu-open');
          console.log('[INFO] Menu closed by nav link');
        }
      });
    });

    // Close menu when clicking outside - debounced
    let outsideClickHandler = null;

    function handleOutsideClick(e) {
      if (isMobileScreen() && mobileMenu.classList.contains('active')) {
        if (!mobileMenu.contains(e.target) && !newHamburger.contains(e.target)) {
          mobileMenu.classList.remove('active');
          newHamburger.classList.remove('active');
          document.body.classList.remove('menu-open');
          console.log('[INFO] Menu closed by outside click');
        }
      }
    }

    // Remove existing listener if any
    if (outsideClickHandler) {
      document.removeEventListener('click', outsideClickHandler);
    }

    // Add new listener
    outsideClickHandler = handleOutsideClick;
    document.addEventListener('click', outsideClickHandler);

    console.log('[SUCCESS] Custom hamburger menu initialized');
  } else {
    console.warn('[WARNING] Required navigation elements not found');
  }

  // Handle responsive behavior
  updateNavigationDisplay();
}

// Update navigation display based on screen size
function updateNavigationDisplay() {
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.nav-menu');
  const desktopNav = document.querySelector('.desktop-nav');

  console.log('[INFO] Updating navigation display, screen:', window.innerWidth);

  if (isMobileScreen()) {
    // Mobile/Tablet mode (1024px and below)
    console.log('[LOAD] Switching to mobile mode');

    if (hamburger) {
      hamburger.style.display = 'flex';
      hamburger.style.visibility = 'visible';
    }
    if (desktopNav) {
      desktopNav.style.display = 'none';
      desktopNav.style.visibility = 'hidden';
    }

    document.body.classList.add('mobile-nav-active');
  } else {
    // Desktop mode (1025px and above)
    console.log('[LOAD] Switching to desktop mode');

    if (hamburger) {
      hamburger.style.display = 'none';
      hamburger.classList.remove('active');
    }
    if (mobileMenu) {
      mobileMenu.classList.remove('active');
      // Clean up body classes when switching to desktop
      document.body.classList.remove('menu-open');
    }
    if (desktopNav) {
      desktopNav.style.display = 'flex';
      desktopNav.style.visibility = 'visible';
    }

    document.body.classList.remove('mobile-nav-active');
  }
}

// Active Navigation Link Highlighting - Enhanced and Fixed
function initializeActiveNavigation() {
  console.log('[TARGET] Initializing active navigation highlighting...');

  // Find all navigation links (both desktop and mobile)
  const allNavLinks = document.querySelectorAll('.nav-link');

  if (allNavLinks.length === 0) {
    console.warn('[WARNING] No navigation links found with class .nav-link');
    return;
  }

  // Get clean path - improved logic
  let currentPath = window.location.pathname;

  // Handle different path scenarios
  if (currentPath === '/' || currentPath === '') {
    currentPath = 'index.html';
  } else {
    // Extract filename from path
    const pathSegments = currentPath.split('/');
    currentPath = pathSegments[pathSegments.length - 1];

    // If no file extension, assume it's a directory and look for index
    if (!currentPath.includes('.')) {
      currentPath = 'index.html';
    }
  }

  console.log(`[INFO] Current page: ${currentPath}`);

  allNavLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;

    let linkPath = href;

    // Handle relative vs absolute paths
    if (href.startsWith('./') || href.startsWith('../')) {
      linkPath = href.substring(href.lastIndexOf('/') + 1);
    } else if (href.startsWith('/')) {
      const pathSegments = href.split('/');
      linkPath = pathSegments[pathSegments.length - 1];
    } else {
      linkPath = href;
    }

    // Handle empty paths
    if (!linkPath || linkPath === '' || linkPath === '/') {
      linkPath = 'index.html';
    }

    const isMatch = currentPath === linkPath;

    // Apply active class
    if (isMatch) {
      link.classList.add('nav-link-active');
      console.log(`[SUCCESS] Active link set: ${linkPath}`);
    } else {
      link.classList.remove('nav-link-active');
    }
  });

  console.log('[SUCCESS] Active navigation highlighting completed');
}

// Initialize responsive navigation with better error handling
function initializeResponsiveNavigation() {
  console.log('[INFO] Initializing responsive navigation...');

  // Initial setup
  updateNavigationDisplay();

  // Handle window resize with improved debouncing
  let resizeTimeout;
  const resizeHandler = function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      console.log('📏 Window resized, updating navigation...');
      updateNavigationDisplay();
    }, 150); // Slightly longer debounce for better performance
  };

  // Remove existing listener if any
  window.removeEventListener('resize', resizeHandler);
  window.addEventListener('resize', resizeHandler);

  // Media query listeners - Fixed
  const mediaQuery = window.matchMedia('(max-width: 1024px)');

  function handleMediaQueryChange(e) {
    console.log(`[INFO] Media query changed: ${e.matches ? 'mobile' : 'desktop'}`);
    setTimeout(updateNavigationDisplay, 50); // Small delay to ensure proper state
  }

  // Use modern addEventListener if available, fallback to addListener
  try {
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaQueryChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleMediaQueryChange);
    }
  } catch (error) {
    console.warn('[WARNING] Media query listeners not supported:', error);
  }

  // Call immediately to set initial state
  handleMediaQueryChange(mediaQuery);

  console.log('[SUCCESS] Responsive navigation initialized');
}

// Initialize all navigation features - Main Function with better error handling
function initializeNavigation() {
  console.log('[LAUNCH] Starting complete navigation initialization...');

  try {
    // Wait for DOM if needed
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(() => {
          initializeMobileMenu();
          initializeActiveNavigation();
          initializeResponsiveNavigation();
        }, 100); // Small delay to ensure all elements are rendered
      });
    } else {
      // DOM already loaded, initialize immediately
      setTimeout(() => {
        initializeMobileMenu();
        initializeActiveNavigation();
        initializeResponsiveNavigation();
      }, 50);
    }

    console.log('[SUCCESS] Navigation initialization scheduled');
  } catch (error) {
    console.error('❌ Navigation initialization failed:', error);
  }
}

// Manual test function - Enhanced
window.testCustomNavigation = function () {
  console.log('[TEST] Manual navigation test');
  console.log('Screen width:', window.innerWidth);
  console.log('Is mobile:', isMobileScreen());
  console.log('Document ready state:', document.readyState);

  // Test element existence
  const elements = {
    hamburger: document.querySelector('.hamburger'),
    mobileMenu: document.querySelector('.nav-menu'),
    desktopNav: document.querySelector('.desktop-nav'),
    navLinks: document.querySelectorAll('.nav-link'),
  };

  console.log('Navigation elements:', elements);

  updateNavigationDisplay();
  initializeMobileMenu();
  initializeActiveNavigation();
};

// Export functions for external use
window.navigationUtils = {
  isMobileScreen,
  updateNavigationDisplay,
  initializeNavigation,
  initializeActiveNavigation,
};

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
  console.log('[LOAD] Auto-initializing navigation...');
  initializeNavigation();
}
