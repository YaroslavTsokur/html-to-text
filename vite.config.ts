
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 8080,      // Changed from 3000 to 8080
    strictPort: true // Do not switch to another port if 8080 is busy
  }
});
