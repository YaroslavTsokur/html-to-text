
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 'base: "./"' allows the app to be deployed to any path (like GitHub Pages subfolders)
  // by making all asset paths relative.
  base: './',
  server: {
    host: '0.0.0.0', 
    port: 8080,      
    strictPort: true 
  }
});
