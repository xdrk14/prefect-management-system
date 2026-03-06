// Consolidated Login Handler - Works with Granular Permissions
// File: public/auth/login-handler.js

(function() {
    'use strict';

    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const messageContainer = document.getElementById('messageContainer');

    async function handleLogin(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        if (!email || !password) {
            showError('Please enter both email and password.');
            return;
        }

        setLoading(true);

        if (!window.firebaseAuth) {
            console.log('[LOGIN] Waiting for Firebase Auth...');
            // Wait up to 2 seconds for Firebase
            for (let i = 0; i < 20; i++) {
                if (window.firebaseAuth) break;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            if (!window.firebaseAuth) {
                 showError('System initializing, please try again in a moment.');
                 setLoading(false);
                 return;
            }
        }

        try {
            console.log('[LOGIN] Authenticating:', email);
            const userCredential = await window.firebaseAuth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Wait for authManager to load user data and permissions
            if (window.authManager) {
                const loaded = await window.authManager.loadUserData(user);
                if (!loaded) {
                    throw new Error('Could not load user profile. Please contact an administrator.');
                }
            }

            showSuccess('Login successful! Redirecting...');
            
            // Log successful login to audit
            if (window.auditLog) {
                await window.auditLog.logUserLogin(email, user.displayName || email, 'success');
            }

            setTimeout(() => {
                window.location.href = 'main.html';
            }, 800);

        } catch (error) {
            console.error('[LOGIN] Error:', error);
            handleLoginError(error);
            setLoading(false);
        }
    }

    function handleLoginError(error) {
        let msg = 'Login failed. Please check your credentials.';
        
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            msg = 'Invalid email or password.';
        } else if (error.code === 'auth/too-many-requests') {
            msg = 'Too many failed attempts. Please try again later.';
        } else if (error.message) {
            msg = error.message;
        }
        
        showError(msg);
    }

    function showError(text) {
        messageContainer.innerHTML = `<div class="message error">${text}</div>`;
        messageContainer.style.display = 'block';
    }

    function showSuccess(text) {
        messageContainer.innerHTML = `<div class="message success">${text}</div>`;
        messageContainer.style.display = 'block';
    }

    function setLoading(loading) {
        if (loginBtn) {
            loginBtn.disabled = loading;
            loginBtn.textContent = loading ? 'Signing in...' : 'Sign In';
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
})();
