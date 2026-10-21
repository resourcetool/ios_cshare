/** Web replacements for React Native APIs that react-native-web leaves empty. No react-native-web import here, so it can be unit tested alone. */

type AlertButton = { text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };
type AlertOptions = { cancelable?: boolean; onDismiss?: () => void };

const PALETTE = {
  light: { surface: '#FFFFFF', ink: '#14252D', muted: '#55666E', line: '#D5DEE1', primary: '#0E5A66', bad: '#B3261E', onPrimary: '#FFFFFF' },
  dark: { surface: '#182226', ink: '#EAF1F2', muted: '#A9BAC0', line: '#33454B', primary: '#5FC4D2', bad: '#F5978F', onPrimary: '#052226' },
};

function currentScheme(): 'light' | 'dark' {
  const forced = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-scheme') : null;
  if (forced === 'dark' || forced === 'light') return forced;
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** An in-app dialog with the same call shape as React Native's Alert.alert (which does nothing on the web). */
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions): void {
    if (typeof document === 'undefined') return;
    const c = PALETTE[currentScheme()];
    const list: AlertButton[] = buttons && buttons.length ? buttons : [{ text: 'OK' }];
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(10,20,24,.5);display:flex;align-items:center;justify-content:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;';

    const box = document.createElement('div');
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', title);
    box.style.cssText = `background:${c.surface};color:${c.ink};border-radius:14px;padding:20px;width:100%;max-width:340px;box-shadow:0 10px 40px rgba(0,0,0,.3);`;

    const h = document.createElement('div');
    h.textContent = title;
    h.style.cssText = 'font-size:18px;font-weight:700;line-height:24px;';
    box.appendChild(h);

    if (message) {
      const p = document.createElement('div');
      p.textContent = message;
      p.style.cssText = `font-size:16px;line-height:22px;margin-top:8px;color:${c.muted};white-space:pre-wrap;`;
      box.appendChild(p);
    }

    const col = document.createElement('div');
    col.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:18px;';
    box.appendChild(col);

    let closed = false;
    const close = (run?: () => void) => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
      if (run) run();
    };
    const cancelBtn = list.find(b => b.style === 'cancel');
    const dismiss = () => close(() => (cancelBtn && cancelBtn.onPress ? cancelBtn.onPress() : options && options.onDismiss ? options.onDismiss() : undefined));
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && (options?.cancelable !== false)) {
        e.stopPropagation();
        dismiss();
      }
    }
    document.addEventListener('keydown', onKey, true);

    const buttons2 = [...list].sort((a, b) => (a.style === 'cancel' ? 1 : 0) - (b.style === 'cancel' ? 1 : 0));
    buttons2.forEach((b, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = b.text ?? 'OK';
      const filled = b.style !== 'cancel';
      const bg = !filled ? 'transparent' : b.style === 'destructive' ? c.bad : c.primary;
      const fg = filled ? c.onPrimary : c.primary;
      btn.style.cssText = `min-height:48px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;border:2px solid ${filled ? bg : c.primary};background:${bg};color:${fg};padding:0 16px;`;
      btn.addEventListener('click', () => close(b.onPress));
      col.appendChild(btn);
      if (i === 0) setTimeout(() => btn.focus(), 0);
    });

    overlay.addEventListener('click', e => {
      if (e.target === overlay && options?.cancelable !== false) dismiss();
    });
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },
};

/** tel:, sms: and mailto: must navigate the page itself on iOS; window.open leaves a blank tab. */
export const Linking = {
  async openURL(url: string): Promise<void> {
    if (/^(tel|sms|mailto):/i.test(url)) {
      window.location.href = url;
      return;
    }
    const w = window.open(url, '_blank', 'noopener');
    if (!w) throw new Error('Could not open the link');
  },
  async canOpenURL(_url: string): Promise<boolean> {
    return true;
  },
};

/** The Web Share API where Safari offers it, otherwise the text is copied. */
export const Share = {
  async share(content: { message?: string; title?: string; url?: string }): Promise<{ action: 'sharedAction' | 'dismissedAction' }> {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ text: content.message, title: content.title, url: content.url });
        return { action: 'sharedAction' };
      } catch (e) {
        if ((e as { name?: string }).name === 'AbortError') return { action: 'dismissedAction' };
        throw e;
      }
    }
    if (navigator.clipboard && content.message) {
      await navigator.clipboard.writeText(content.message);
      Alert.alert('Copied', 'The text was copied. You can paste it into WhatsApp, SMS or e-mail.');
      return { action: 'sharedAction' };
    }
    throw new Error('Sharing is not available in this browser');
  },
};

export const PermissionsAndroid = {
  PERMISSIONS: { READ_CALENDAR: 'READ_CALENDAR', WRITE_CALENDAR: 'WRITE_CALENDAR' },
  RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
  async requestMultiple(): Promise<Record<string, string>> {
    return {};
  },
};

export const BackHandler = {
  exitApp(): void {},
  addEventListener(): { remove: () => void } {
    return { remove() {} };
  },
};

export const Vibration = { vibrate(): void {}, cancel(): void {} };
export const NativeModules: Record<string, unknown> = {};
