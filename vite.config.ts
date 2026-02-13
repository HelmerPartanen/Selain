import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      },
      build: {
        minify: 'esbuild',
        sourcemap: false,
        cssCodeSplit: true,
        target: 'esnext',
        cssMinify: 'esbuild',
        reportCompressedSize: false,
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            manualChunks: (id) => {
              // Optimize chunk splitting for better caching
              if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('react-dom')) {
                  return 'vendor-react';
                }
                if (id.includes('react-icons')) {
                  return 'vendor-icons';
                }
                return 'vendor';
              }
              if (id.includes('/sky/')) {
                return 'sky-system';
              }
              if (id.includes('widgets')) {
                return 'widgets';
              }
              if (id.includes('SettingsPage')) {
                return 'settings';
              }
            },
            assetFileNames: 'assets/[name]-[hash][extname]',
            chunkFileNames: 'js/[name]-[hash].js',
            entryFileNames: 'js/[name]-[hash].js'
          },
          treeshake: {
            moduleSideEffects: false,
            propertyReadSideEffects: false,
            tryCatchDeoptimization: false
          }
        },
        assetsInlineLimit: 4096,
      },
      esbuild: {
        drop: mode === 'production' ? ['console', 'debugger'] : [],
        legalComments: 'none',
        treeShaking: true
      },
      optimizeDeps: {
        include: ['react', 'react-dom'],
        exclude: []
      }
    };
});
