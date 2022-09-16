/// <reference types="vitest" />
import * as path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: process.argv[2] ? undefined : 'examples',
  logLevel: process.argv[2] ? 'warn' : 'info',
  resolve: {
    alias: {
      opusgl: path.resolve(process.cwd(), 'src'),
    },
  },
  test: {
    dir: 'tests',
    environment: 'jsdom',
    setupFiles: 'tests/index.ts',
  },
  build: {
    minify: false,
    sourcemap: true,
    target: 'esnext',
    lib: {
      formats: ['es', 'cjs'],
      entry: 'src/index.ts',
      fileName: '[name]',
    },
    rollupOptions: {
      external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
      output: {
        preserveModules: true,
        sourcemapExcludeSources: true,
      },
    },
  },
  plugins: [
    {
      name: 'vite-tsc',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'index.d.ts', source: `export * from '../src'` })
      },
    },
  ],
})
