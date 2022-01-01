#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const swc = require('@swc/core')
const recursiveReaddir = require('recursive-readdir')
const package = require('./package.json')

// Get project config
const swcrc = path.join(process.cwd(), '.swcrc')
const config = JSON.parse(fs.readFileSync(swcrc, 'utf-8'))

// Matches relative imports and requires
const IMPORT_REGEX = /(require\(['"]|from ['"])\.+\/[^'"]+/g

// Checks if file extension is a module
const MODULE_REGEX = /\.(mjs|tsx|ts|jsx|js)$/

/**
 * Returns true if filename ends with mjs, js/jsx, ts/jsx, etc.
 */
const isModule = (filename) => MODULE_REGEX.test(filename)

/**
 * Transforms a file for esm or cjs.
 */
function transform(filePath, type) {
  // Get file contents
  const src = fs.readFileSync(filePath, { encoding: 'utf-8' })

  // Transform file
  const filename = path.basename(filePath)
  const options = { ...config, filename, module: { type: type === 'cjs' ? 'commonjs' : 'es6' } }
  const { code } = swc.transformSync(src, options)

  // Transform file extensions and add type suffixes to imports/requires
  const source = code.replace(IMPORT_REGEX, (str) => {
    const name = str.replace(MODULE_REGEX, '')
    const hasExt = MODULE_REGEX.test(str)

    return `${name}.${type}${hasExt ? '.js' : ''}`
  })

  // Write output
  const targetDir = path.dirname(filePath).replace('src', 'dist')
  const [name] = path.basename(filePath).split('.')
  fs.writeFileSync(path.resolve(targetDir, `${name}.${type}.js`), source)
}

// Build and transform
const src = path.resolve(process.cwd(), 'src')
recursiveReaddir(src).then((paths) =>
  paths.forEach((filePath) => {
    // Don't transform non-modules
    if (!isModule(filePath)) return
    // Don't transform tests
    if (filePath.includes('.test.')) return

    // Transform source
    transform(filePath, 'esm')
    transform(filePath, 'cjs')
  }),
)

// Copy files
;['LICENSE', 'README.md'].forEach((file) => {
  fs.copyFileSync(path.resolve(process.cwd(), file), path.resolve(process.cwd(), `dist/${file}`))
})

// Add package.json with updated resolution fields
delete package.private
;['main', 'module', 'types'].forEach((field) => (package[field] = package[field].replace('dist', '.')))
fs.writeFileSync(path.resolve(process.cwd(), 'dist/package.json'), JSON.stringify(package, null, 2))
