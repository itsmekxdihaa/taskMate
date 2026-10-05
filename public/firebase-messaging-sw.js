// Receives reminder push notifications while TaskMate is closed or in the background
importScripts('https://www.gstatic.com/firebasejs/12.2.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAIUfZuVeWaeTHAMBVfZilV8_OCVjqpc9s',
  authDomain: 'taskmate-app-c6314.firebaseapp.com',
  projectId: 'taskmate-app-c6314',
  storageBucket: 'taskmate-app-c6314.firebasestorage.app',
  messagingSenderId: '967304132836',
  appId: '1:967304132836:web:078a2d223d7e2c27ce94f1',
});

// Notifications with a "notification" payload are displayed automatically by the SDK
firebase.messaging();
