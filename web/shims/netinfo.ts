/**
 * Online status for the web. navigator.onLine is a hint only (Safari can report "online" with no
 * route), so Firestore's own "fromCache" and error states remain the source of truth for data.
 */
type State = { isConnected: boolean; isInternetReachable: boolean | null };

const NetInfo = {
  addEventListener(cb: (s: State) => void): () => void {
    const emit = () => cb({ isConnected: navigator.onLine, isInternetReachable: navigator.onLine ? null : false });
    window.addEventListener('online', emit);
    window.addEventListener('offline', emit);
    emit();
    return () => {
      window.removeEventListener('online', emit);
      window.removeEventListener('offline', emit);
    };
  },
  async fetch(): Promise<State> {
    return { isConnected: navigator.onLine, isInternetReachable: navigator.onLine ? null : false };
  },
};

export default NetInfo;
