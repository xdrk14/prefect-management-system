// API Request Utility with Automatic Token Attachment
// File: public/auth/api-client.js
(function() {
    'use strict';

    console.log('[API-CLIENT] Initializing automatic token injection...');

    // Store the original fetch function
    const originalFetch = window.fetch;
    
    // Track if Firebase and Auth are ready
    let authReady = false;
    let authReadyPromise = null;
    let authReadyResolve = null;

    // Create the promise immediately
    authReadyPromise = new Promise((resolve) => {
        authReadyResolve = resolve;
    });

    // Check if auth is already ready
    function checkAuthReady() {
        if (window.firebaseAuth?.currentUser) {
            if (!authReady) {
                authReady = true;
                console.log('[API-CLIENT] ✅ User authenticated:', window.firebaseAuth.currentUser.email);
                authReadyResolve();
            }
            return true;
        }
        return false;
    }

    // Listen for Firebase ready event
    window.addEventListener('firebaseReady', () => {
        console.log('[API-CLIENT] Firebase ready, waiting for auth...');
        
        // Check immediately if user is already signed in
        if (checkAuthReady()) return;
        
        // Otherwise, listen for auth state changes
        if (window.firebaseAuth) {
            window.firebaseAuth.onAuthStateChanged((user) => {
                if (user && !authReady) {
                    authReady = true;
                    console.log('[API-CLIENT] ✅ User authenticated:', user.email);
                    authReadyResolve();
                }
            });
        }
    });

    // Fallback: Check periodically if Firebase is already loaded
    const checkInterval = setInterval(() => {
        if (checkAuthReady()) {
            clearInterval(checkInterval);
        }
    }, 100);

    // Timeout after 15 seconds
    setTimeout(() => {
        clearInterval(checkInterval);
        if (!authReady) {
            console.warn('[API-CLIENT] ⚠️ Auth timeout after 15s, API requests may fail');
            authReadyResolve(); // Resolve anyway to unblock requests
        }
    }, 15000);

    // Enhanced fetch that automatically includes Firebase ID token for API requests
    window.fetch = async function(url, options = {}) {
        try {
            // Check if this is an API request to our server
            const isApiRequest = typeof url === 'string' && url.startsWith('/api/');
            
            if (!isApiRequest) {
                // Not an API request, use original fetch
                return originalFetch(url, options);
            }

            // Wait for auth to be ready before making API requests
            await authReadyPromise;

            // Get current user and ID token
            const user = window.firebaseAuth?.currentUser;
            if (!user) {
                console.warn('[API-CLIENT] No authenticated user for:', url);
                // Still try the request, server will return 401 if needed
                return originalFetch(url, options);
            }

            // Get fresh ID token
            const idToken = await user.getIdToken();

            // Merge headers with Authorization header
            const headers = {
                ...(options.headers || {}),
                'Authorization': `Bearer ${idToken}`
            };

            // Make the request with the token
            const response = await originalFetch(url, {
                ...options,
                headers
            });

            // Handle 401 Unauthorized - token might be expired
            if (response.status === 401) {
                console.warn('[API-CLIENT] 401 Unauthorized, refreshing token...');
                try {
                    // Force token refresh
                    const newToken = await user.getIdToken(true);
                    headers.Authorization = `Bearer ${newToken}`;
                    
                    // Retry the request with fresh token
                    return await originalFetch(url, {
                        ...options,
                        headers
                    });
                } catch (refreshError) {
                    console.error('[API-CLIENT] Token refresh failed:', refreshError);
                    return response; // Return the original 401 response
                }
            }

            return response;
        } catch (error) {
            console.error('[API-CLIENT] Request failed:', error);
            throw error;
        }
    };

    // Also provide the explicit authenticatedFetch for cases where it's needed
    window.authenticatedFetch = window.fetch;
    
    console.log('[API-CLIENT] 🔐 Automatic token injection enabled for all /api/* requests');
})();
