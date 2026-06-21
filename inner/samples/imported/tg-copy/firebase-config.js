// Firebase конфигурация и инициализация
// Загружается после firebase-app-compat.js

(function() {
  const FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  // Сохраняем в глобальную переменную
  (typeof self !== 'undefined' ? self : window).FIREBASE_CONFIG = FIREBASE_CONFIG;

  // Инициализируем Firebase App сразу при загрузке скрипта
  // (firebase уже загружен к этому моменту, так как этот скрипт загружается после firebase-app-compat.js)
  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    // Проверяем, не инициализирован ли уже
    if (!firebase.apps || firebase.apps.length === 0) {
      // Проверяем, что конфиг не содержит плейсхолдеров
      if (FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY') {
        firebase.initializeApp(FIREBASE_CONFIG);
        console.log('[Firebase] App инициализирован');
      } else {
        console.warn('[Firebase] Конфигурация не задана. Пожалуйста, замените плейсхолдеры в firebase-config.js');
      }
    }
  } else {
    console.error('[Firebase] SDK не найден!');
  }
})();
