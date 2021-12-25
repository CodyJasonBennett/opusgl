#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const package = require('./package.json')

// Add package.json with updated resolution fields
fs.writeFileSync(
  path.resolve(process.cwd(), 'dist/package.json'),
  JSON.stringify(
    {
      ...package,
      types: './index.d.ts',
      module: './index.js',
      // TODO - main: '/index.cjs.js'
      private: false,
    },
    null,
    2,
  ),
)

// Copy files
;['LICENSE', 'README.md'].forEach((file) => {
  fs.copyFileSync(path.resolve(process.cwd(), file), path.resolve(process.cwd(), `dist/${file}`))
})
