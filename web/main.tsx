import { AppRegistry } from 'react-native';
import App from './src/App';

AppRegistry.registerComponent('CSHARE', () => App);
AppRegistry.runApplication('CSHARE', { rootTag: document.getElementById('root') });

// Offline app shell. Firestore data is cached separately by Firestore itself.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(e => console.warn('[CSHARE] service worker', e));
  });
}
