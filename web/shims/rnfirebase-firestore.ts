/**
 * Lets the unchanged services (which call @react-native-firebase/firestore) run on the Firebase
 * JS SDK. The "compat" API has the same namespaced shape: collection().where().onSnapshot(),
 * FieldValue, Timestamp, FieldPath, batch(), snapshot.exists / metadata.fromCache.
 */
import 'firebase/compat/firestore';
import { app, firebase } from './firebaseApp';

const db = app.firestore();

// Same collections, same data. Offline cache on, shared between tabs, no size cap.
db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
db.enablePersistence({ synchronizeTabs: true }).catch((e: unknown) => {
  console.warn('[CSHARE] Firestore offline cache could not be enabled; the app still works online.', e);
});

const instance = {
  collection: (path: string) => db.collection(path),
  doc: (path: string) => db.doc(path),
  batch: () => db.batch(),
  runTransaction: <T,>(fn: (t: firebase.firestore.Transaction) => Promise<T>) => db.runTransaction(fn),
  /** Persistence is configured above. React Native's call is kept working. */
  settings: async (_settings: unknown): Promise<void> => {},
};

const firestore = Object.assign(() => instance, {
  FieldValue: firebase.firestore.FieldValue,
  Timestamp: firebase.firestore.Timestamp,
  FieldPath: firebase.firestore.FieldPath,
});

export default firestore;

// Type-only: the services import this as FT for DocumentData.
// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace FirebaseFirestoreTypes {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type DocumentData = { [field: string]: any };
}
