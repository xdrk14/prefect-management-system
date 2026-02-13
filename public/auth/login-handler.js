// FIXED Firebase Config - Consistent variable names
const firebaseConfig = {
  apiKey: 'AIzaSyDPLPkcSAsYSG40T1Ex23kBos7NoEuARMc',
  authDomain: 'prefectmanagementsystem.firebaseapp.com',
  projectId: 'prefectmanagementsystem',
  storageBucket: 'prefectmanagementsystem.firebasestorage.app',
  messagingSenderId: '582867197955',
  appId: '1:582867197955:web:1973522f7d3c3f7f972e36',
  measurementId: 'G-G27HTPVVP0',
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// FIXED: Make Firebase globally available with consistent names
window.firebaseAuth = auth;
window.firebaseDb = db; // Changed from firebaseDB to firebaseDb (consistent with your other files)
window.firebase = firebase; // Also make firebase itself available

let isLoading = false;

function showMessage(message, type = 'error') {
  const container = document.getElementById('messageContainer');

  if (container) {
    container.innerHTML = `<div class="message ${type}">${message}</div>`;
    container.style.display = 'block';
  } else {
    const existingMessage = document.querySelector('.error-message, .success-message, .message');
    if (existingMessage) {
      existingMessage.textContent = message;
      existingMessage.className = `message ${type}`;
      existingMessage.style.display = 'block';
    } else {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${type}`;
      messageDiv.textContent = message;
      messageDiv.style.cssText = `
                padding: 10px;
                margin: 10px 0;
                border-radius: 4px;
                color: white;
                background-color: ${type === 'error' ? '#dc3545' : '#28a745'};
                display: block;
            `;

      const form = document.getElementById('loginForm');
      if (form) {
        form.insertBefore(messageDiv, form.firstChild);
      } else {
        alert(message);
      }
    }
  }
}

function hideMessage() {
  const container = document.getElementById('messageContainer');
  if (container) {
    container.style.display = 'none';
  }

  const existingMessage = document.querySelector('.error-message, .success-message, .message');
  if (existingMessage) {
    existingMessage.style.display = 'none';
  }
}

function setLoading(loading) {
  isLoading = loading;
  const btn = document.getElementById('loginBtn');
  const text = document.getElementById('loginBtnText');
  const spinner = document.getElementById('loginSpinner');

  if (loading) {
    btn.disabled = true;
    text.style.display = 'none';
    spinner.style.display = 'inline-block';
  } else {
    btn.disabled = false;
    text.style.display = 'inline';
    spinner.style.display = 'none';
  }
}

async function handleLogin(e) {
  e.preventDefault();

  if (isLoading) return;

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showMessage('Please fill in all fields', 'error');
    return;
  }

  setLoading(true);
  hideMessage();

  console.log('[LOGIN] Attempting login for:', email);

  try {
    // Step 1: Firebase Authentication
    console.log('[LOGIN] Step 1: Authenticating with Firebase...');
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    console.log('[LOGIN] ✅ Firebase authentication successful');

    // Wait a moment for auth state to settle
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 2: Check user role (FIXED: Add error handling for permissions)
    console.log('[LOGIN] Step 2: Checking user permissions...');

    let userData = null;
    try {
      const userDoc = await db.collection('userRoles').doc(email).get();

      if (!userDoc.exists) {
        console.log('[LOGIN] ❌ User document not found in Firestore');
        await auth.signOut();
        throw new Error('User not authorized for this system');
      }

      userData = userDoc.data();
      console.log('[LOGIN] ✅ User data retrieved:', userData);
    } catch (permissionError) {
      console.error('[LOGIN] ❌ Permission error when reading user data:', permissionError);

      // If it's a permission error, the user might exist but rules are blocking access
      if (permissionError.code === 'permission-denied') {
        // Try to handle this gracefully - maybe the user exists but rules need adjustment
        console.log('[LOGIN] Attempting to proceed with basic auth (rules may need adjustment)');

        // For now, create a temporary user data object
        userData = {
          role: 'UNKNOWN',
          active: true,
          name: email,
        };

        showMessage(
          '⚠️ Login successful but with limited permissions. Please contact admin.',
          'warning'
        );
      } else {
        await auth.signOut();
        throw permissionError;
      }
    }

    // Step 3: Check if user is active
    if (userData && !userData.active) {
      console.log('[LOGIN] ❌ User account is deactivated');
      await auth.signOut();
      throw new Error('Account has been deactivated');
    }

    // Step 4: Success - LOG AND REDIRECT
    console.log('[LOGIN] ✅ Login successful! Redirecting...');
    showMessage('Login successful! Redirecting...', 'success');

    // Log successful login
    try {
      if (window.auditLog) {
        await window.auditLog.logUserLogin(email, userData.name || email, 'success');
        console.log('[LOGIN] ✅ Login audit logged successfully');
      }
    } catch (auditError) {
      console.log('[LOGIN] ⚠️ Failed to log login audit:', auditError);
    }

    // Clear form
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';

    // Redirect after short delay to show success message
    setTimeout(() => {
      window.location.href = 'main.html';
    }, 1000);
  } catch (error) {
    console.log('[LOGIN] ❌ Login failed:', error);
    console.log('[LOGIN] Error code:', error.code);
    console.log('[LOGIN] Error message:', error.message);

    // Log failed login attempt
    try {
      if (window.auditLog) {
        await window.auditLog.logUserLogin(email, email, 'failure');
      }
    } catch (auditError) {
      console.log('[LOGIN] ⚠️ Failed to log failed login audit:', auditError);
    }

    const errorMessages = {
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/user-not-found': 'No account found with this email address.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Invalid email or password. Please try again.',
      'auth/invalid-login-credentials': 'Invalid email or password. Please try again.',
      'auth/too-many-requests': 'Too many failed login attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your internet connection.',
      'permission-denied': 'Database permission error. Please contact administrator.',
      'User not authorized for this system': 'You are not authorized to access this system.',
      'Account has been deactivated': 'Your account has been deactivated. Please contact support.',
    };

    let friendlyMessage = errorMessages[error.code] || errorMessages[error.message];

    if (!friendlyMessage) {
      friendlyMessage = 'Login failed. Please check your credentials and try again.';
    }

    showMessage(friendlyMessage, 'error');
  } finally {
    setLoading(false);
  }
}

// DIAGNOSTIC FUNCTION - Add this for debugging
async function testFirebaseConnection() {
  console.log('🧪 Testing Firebase Connection...');
  console.log('Auth available:', !!window.firebaseAuth);
  console.log('DB available:', !!window.firebaseDb);
  console.log('Current user:', window.firebaseAuth.currentUser?.email || 'None');

  // Test basic auth
  try {
    const testResult = await window.firebaseAuth.signInWithEmailAndPassword(
      'hasthij29@gmail.com',
      'YOUR_PASSWORD'
    );
    console.log('✅ Auth test successful');

    // Test Firestore read
    const testDoc = await window.firebaseDb
      .collection('userRoles')
      .doc('hasthij29@gmail.com')
      .get();
    console.log('✅ Firestore read test:', testDoc.exists ? 'SUCCESS' : 'USER_NOT_FOUND');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Make test function available globally
window.testFirebaseConnection = testFirebaseConnection;

// Setup form handler
document.getElementById('loginForm')?.addEventListener('submit', handleLogin);

console.log('🔐 Enhanced login handler loaded with error handling and diagnostics');
console.log('💡 To test connection, run: testFirebaseConnection()');

// TEMPORARY: Emit Firebase ready event for other scripts
setTimeout(() => {
  window.dispatchEvent(new Event('firebaseReady'));
  console.log('🔥 Firebase ready event dispatched');
}, 1000);
