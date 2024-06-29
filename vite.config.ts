import { defineConfig } from 'vite';
import path from 'path';

const root = `${process.cwd()}`;

// https://vitejs.dev/config/
export default defineConfig({
  root: root,
  publicDir: 'static',
  build: {
    target: 'es2015',
    outDir: `${path.resolve(__dirname)}/dist/out`,
    emptyOutDir: true,
    sourcemap: true,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: true,

    rollupOptions: {
      input: {
        desktop: `${path.resolve(root, 'src/desktop.ts')}/`,
        config: `${path.resolve(root, 'src/config.ts')}/`,
      },
      output: {
        manualChunks: {},
        entryFileNames: 'js/[name].js',
        assetFileNames: 'js/[name][extname]',
      },
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  plugins: [],
});