import firebase from 'firebase/compat/app';

/**
 * CSHARE's real Firebase project. These are public identifiers (they ship inside every web app).
 * Protect the key by restricting it to your site's address in Google Cloud Console >
 * APIs & Services > Credentials, and rely on Firestore security rules for data access.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyBbdYzeL_DKsgSHRoSeDVcfTsAgwvUhO74',
  authDomain: 'cshare-2fac4.firebaseapp.com',
  projectId: 'cshare-2fac4',
  storageBucket: 'cshare-2fac4.firebasestorage.app',
  messagingSenderId: '102240826607',
  appId: '1:102240826607:web:e9418dec69a10e9cd1d71a',
};

export const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
export { firebase };
