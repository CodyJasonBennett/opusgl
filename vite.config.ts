/// <reference types="vitest" />
import * as path from 'node:path'
import * as dns from 'node:dns'
import { defineConfig } from 'vite'

// Serve on localhost for origin trial
dns.setDefaultResultOrder('verbatim')

// Whether dev server is running (dev server takes no arguments)
const dev = !process.argv[2]

export default defineConfig({
  // Point to examples/index.html when running dev server
  root: dev ? 'examples' : undefined,
  server: { port: 80 },
  // Allow local imports to package from examples/tests
  resolve: {
    alias: {
      opusgl: path.resolve(process.cwd(), 'src'),
    },
  },
  // Testing options available with Vitest
  test: {
    dir: 'tests',
    environment: 'jsdom',
    setupFiles: 'tests/index.ts',
  },
  build: {
    // Disable library minification since it can mangle tree-shaking
    minify: false,
    // Publish sourcemaps so errors point to sourcecode in development
    sourcemap: true,
    // Downlevel transpile for compat between Node versions
    target: 'es2018',
    lib: {
      // Configure ESM/CJS targets
      formats: ['es', 'cjs'],
      // Package entrypoint, local to config
      entry: 'src/index.ts',
      // Keep the original name with `preserveModules`
      fileName: '[name]',
    },
    rollupOptions: {
      // Don't bundle dependencies (only include any with invalid/problematic Node configuration)
      external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
      output: {
        // Don't bundle files so tools can skip whole trees when tree-shaking
        preserveModules: true,
        // Don't inline source blobs into sourcemaps, point them to src instead
        sourcemapExcludeSources: true,
      },
    },
  },
  plugins: [
    // Points TypeScript definitions to source rather than run `tsc` postbuild since we publish sourcemaps
    {
      name: 'vite-tsc',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'index.d.ts', source: `export * from '../src'` })
      },
    },
    // Inserts a WebGPU origin trial token for local testing
    {
      name: 'vite-gpu',
      transformIndexHtml() {
        return [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'origin-trial',
              content:
                'ApB+TDs41dv4jFD67a312hCPRMkNgkhNEK6Or8SQWWNtTEqn1CbOk3tyvbbvtnNuaR2Wn4mTx8ivaDxpH+2WpAsAAABHeyJvcmlnaW4iOiJodHRwOi8vbG9jYWxob3N0OjgwIiwiZmVhdHVyZSI6IldlYkdQVSIsImV4cGlyeSI6MTY3NTIwOTU5OX0=',
            },
            injectTo: 'head',
          },
        ]
      },
    },
  ],
})
