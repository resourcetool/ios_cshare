import 'firebase/compat/auth';
import { app } from './firebaseApp';

// Firebase Auth on the web keeps the sign-in in IndexedDB, like the Android app keeps it on the device.
const auth = () => app.auth();
export default auth;
