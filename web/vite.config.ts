import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const shim = (file: string) => path.resolve(__dirname, 'shims', file);
const EXT = ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'];

export default defineConfig(({ mode }) => ({
  // Relative base: works under https://<user>.github.io/<repo>/ without knowing the repo name.
  base: './',
  plugins: [react()],
  define: {
    __DEV__: JSON.stringify(mode !== 'production'),
    global: 'globalThis',
  },
  resolve: {
    extensions: EXT,
    alias: [
      { find: /^react-native$/, replacement: shim('react-native.tsx') },
      { find: /^@react-native-firebase\/firestore$/, replacement: shim('rnfirebase-firestore.ts') },
      { find: /^@react-native-firebase\/auth$/, replacement: shim('rnfirebase-auth.ts') },
      { find: /^@react-native-async-storage\/async-storage$/, replacement: shim('async-storage.ts') },
      { find: /^@react-native-community\/netinfo$/, replacement: shim('netinfo.ts') },
      { find: /^react-native-print$/, replacement: shim('rn-print.ts') },
    ],
  },
  optimizeDeps: {
    esbuildOptions: { resolveExtensions: EXT, loader: { '.js': 'jsx' } },
  },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 2500 },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
}));
