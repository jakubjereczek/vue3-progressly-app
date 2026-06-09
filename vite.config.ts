import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  base: '/vue3-goaletic-app/',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@supabase') || id.includes('supabase-js')) return 'vendor-supabase';
          if (id.includes('lucide-vue-next')) return 'vendor-icons';
          if (id.includes('reka-ui') || id.includes('@vueuse')) return 'vendor-ui';
          if (id.includes('vue-i18n') || id.includes('@intlify')) return 'vendor-i18n';
          return 'vendor';
        },
      },
    },
  },
});
