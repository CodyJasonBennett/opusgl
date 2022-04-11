import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'examples',
  resolve: {
    alias: {
      opusgl: path.resolve(process.cwd(), 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: path.resolve(process.cwd(), 'tests/index.ts'),
  },
  build: {
    minify: false,
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
