/**
 * Replaces `react-native` for the web build. Everything comes from react-native-web, except the
 * handful of native APIs it leaves empty or does not have (see web-apis.ts). The original screens
 * keep calling Alert.alert / Share.share / Linking.openURL exactly as on Android.
 * Explicit exports below take precedence over the star re-export.
 */
export * from 'react-native-web';
export { Alert, Linking, Share, PermissionsAndroid, BackHandler, Vibration, NativeModules } from './web-apis';
