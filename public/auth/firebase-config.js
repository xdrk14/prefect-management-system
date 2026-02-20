// Clean Firebase Configuration
// File: public/auth/firebase-config.js
(async function () {
  'use strict';

  // Wait for Firebase SDK to load before fetching and init
  const checkFirebase = () => {
    if (typeof firebase !== 'undefined' && typeof firebase.auth === 'function' && typeof firebase.firestore === 'function') {
      initFirebase();
    } else {
      setTimeout(checkFirebase, 100);
    }
  };

  // Initialize Firebase after fetching config
  async function initFirebase() {
    try {
      const response = await fetch('/api/config/firebase');
      if (!response.ok) throw new Error('Failed to fetch Firebase config');
      const firebaseConfig = await response.json();

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

  checkFirebase();
})();
 document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("currentYear");
    if (el) el.textContent = String(new Date().getFullYear());
  });