
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use relative base path so it works on any GitHub Pages subpath
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    host: '0.0.0.0', 
    port: 8080,      
    strictPort: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  }
});
