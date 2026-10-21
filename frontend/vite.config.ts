import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  optimizeDeps: { include: ['three', '@react-three/fiber', '@react-three/drei'] },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three';
          if (
            id.includes('/node_modules/@react-three/') ||
            id.includes('/node_modules/three-stdlib/')
          )
            return 'scene-controls';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    maxWorkers: 2,
    testTimeout: 10000,
  },
});
