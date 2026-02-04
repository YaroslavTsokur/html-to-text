
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use relative base path to ensure assets load correctly on GitHub Pages (username.github.io/repo-name/)
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Generate sourcemaps for easier debugging if needed, but usually off for production
    sourcemap: false,
    // Ensure the build is clean
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0', 
    port: 8080,      
    strictPort: true,
  }
});
