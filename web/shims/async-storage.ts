/** AsyncStorage on top of localStorage, with an in-memory fallback if the browser refuses storage. */
const memory = new Map<string, string>();

function store(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const s = store();
      if (s) return s.getItem(key);
    } catch {
      // fall through to memory
    }
    return memory.has(key) ? (memory.get(key) as string) : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      const s = store();
      if (s) {
        s.setItem(key, value);
        return;
      }
    } catch {
      // fall through to memory
    }
    memory.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    try {
      store()?.removeItem(key);
    } catch {
      // ignore
    }
    memory.delete(key);
  },
};

export default AsyncStorage;
