// Clean Firebase Configuration
// File: public/auth/firebase-config.js
(function () {
  'use strict';

  // REPLACE WITH YOUR ACTUAL FIREBASE CONFIG
  const firebaseConfig = {
    apiKey: 'AIzaSyDPLPkcSAsYSG40T1Ex23kBos7NoEuARMc',
    authDomain: 'prefectmanagementsystem.firebaseapp.com',
    projectId: 'prefectmanagementsystem',
    storageBucket: 'prefectmanagementsystem.firebasestorage.app',
    messagingSenderId: '582867197955',
    appId: '1:582867197955:web:1973522f7d3c3f7f972e36',
    measurementId: 'G-G27HTPVVP0',
  };

  // Initialize Firebase immediately
  function initFirebase() {
    try {
      if (firebase.apps.length === 0) {
        firebase.initializeApp(firebaseConfig);
      }

      window.firebaseAuth = firebase.auth();
      window.firebaseDb = firebase.firestore();

      // Enable network
      window.firebaseDb.enableNetwork().catch(e => console.warn('Network enable failed:', e));

      // Notify that Firebase is ready
      window.dispatchEvent(new CustomEvent('firebaseReady'));

      console.log('✅ Firebase initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      window.dispatchEvent(new CustomEvent('firebaseError', { detail: error.message }));
      return false;
    }
  }

  // Initialize when Firebase SDK is available
  if (typeof firebase !== 'undefined') {
    initFirebase();
  } else {
    // Wait for Firebase SDK to load
    const checkFirebase = () => {
      if (typeof firebase !== 'undefined') {
        initFirebase();
      } else {
        setTimeout(checkFirebase, 100);
      }
    };
    checkFirebase();
  }
})();
