// firebase.js — Altiora Firebase initialization
// Uses the Firebase compat SDK (loaded via CDN) so it works with plain <script> tags
// The compat SDK exposes firebase.auth(), firebase.firestore(), etc. globally.

const firebaseConfig = {
  apiKey:            "AIzaSyDjq-O5ugeLdtSUfQgsySX4JH7PhEGtEw4",
  authDomain:        "altiora-bb78a.firebaseapp.com",
  projectId:         "altiora-bb78a",
  storageBucket:     "altiora-bb78a.firebasestorage.app",
  messagingSenderId: "331997203846",
  appId:             "1:331997203846:web:23ec92bfd10d96ec66f007",
  measurementId:     "G-7W0JVKYN36"
};

// Initialize only once (guard for pages that load this script multiple times)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Convenience globals used across all pages
const auth = firebase.auth();
const db = firebase.firestore();
window.auth = auth;
window.db = db;

console.log("Clean data loaded");
