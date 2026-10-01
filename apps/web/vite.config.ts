import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@spray-paragon/domain': path.resolve(__dirname, '../../packages/domain/src/index.ts'),
      '@spray-paragon/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts')
    }
  },
  build: {
    outDir: 'dist'
  }
});