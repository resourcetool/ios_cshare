import { afterEach, describe, expect, it, vi } from 'vitest';
import { Alert, Linking } from '../shims/web-apis';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Alert shim', () => {
  it('shows a dialog and runs the pressed button', () => {
    const yes = vi.fn();
    const no = vi.fn();
    Alert.alert('Delete?', 'Sure?', [
      { text: 'Go back', style: 'cancel', onPress: no },
      { text: 'Delete', style: 'destructive', onPress: yes },
    ]);
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog).not.toBeNull();
    const buttons = Array.from(document.querySelectorAll('button'));
    // the cancel button is listed last
    expect(buttons.map(b => b.textContent)).toEqual(['Delete', 'Go back']);
    buttons[0].click();
    expect(yes).toHaveBeenCalledTimes(1);
    expect(no).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('counts a tap outside as the cancel button', () => {
    const no = vi.fn();
    Alert.alert('Q', undefined, [{ text: 'Go back', style: 'cancel', onPress: no }, { text: 'OK' }], { cancelable: true });
    (document.querySelector('[role="alertdialog"]')!.parentElement as HTMLElement).click();
    expect(no).toHaveBeenCalledTimes(1);
  });

  it('falls back to an OK button', () => {
    Alert.alert('Done');
    expect(document.querySelector('button')!.textContent).toBe('OK');
  });
});

describe('Linking shim', () => {
  it('opens other links in a new tab', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    await Linking.openURL('https://example.com');
    expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener');
    open.mockRestore();
  });
});
