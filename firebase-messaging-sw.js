importScripts(
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js',
    './admin-firebase-config.js',
);
firebase.initializeApp(adminFirebaseConfig);
firebase.messaging();
