import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  root: 'examples',
  resolve: {
    alias: {
      opusgl: path.resolve(process.cwd(), 'src'),
    },
  },
  test: {
    dir: path.resolve(process.cwd(), 'tests'),
    environment: 'jsdom',
    setupFiles: path.resolve(process.cwd(), 'tests/index.ts'),
  },
  build: {
    minify: false,
    outDir: path.resolve(process.cwd(), 'dist'),
    emptyOutDir: true,
    target: 'esnext',
    lib: {
      formats: ['es', 'cjs'],
      entry: path.resolve(process.cwd(), 'src/index.ts'),
    },
    rollupOptions: {
      output: {
        entryFileNames: '[name].[format].js',
        preserveModules: true,
        dir: 'dist',
      },
    },
  },
})
