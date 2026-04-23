const firebaseConfig = {
  apiKey: "AIzaSyBSVTl6Jv1zKSevxVKPLT7h-jgAEupT568",
  authDomain: "gestion-clientes-111fc.firebaseapp.com",
  projectId: "gestion-clientes-111fc",
  storageBucket: "gestion-clientes-111fc.firebasestorage.app",
  messagingSenderId: "380455873844",
  appId: "1:380455873844:web:c918f04ae637f02ede4961",
};

const SYNC_ENABLED = !firebaseConfig.apiKey.startsWith('TU_');

export { firebaseConfig, SYNC_ENABLED };
