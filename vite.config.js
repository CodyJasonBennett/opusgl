import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      opusgl: path.resolve(process.cwd(), 'src'),
    },
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
