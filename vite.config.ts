import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Для GitHub Pages: используйте имя репозитория
  base: process.env.NODE_ENV === 'production' ? '/html-to-text/' : './',
  build: {
    outDir: 'dist',
    emptyOutDir: true, // Очищать папку dist перед сборкой
    sourcemap: false, // Отключаем sourcemap для уменьшения размера
  },
  server: {
    host: '0.0.0.0', 
    port: 8080,      
    strictPort: true,
  },
  // Улучшаем производительность сборки
  optimizeDeps: {
    include: ['react', 'react-dom'],
    force: true, // Принудительная оптимизация
  },
  // Улучшаем производительность в dev режиме
  preview: {
    port: 8080,
  },
});