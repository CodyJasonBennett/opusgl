#!/usr/bin/env node

const path = require('path')
const fs = require('fs')
const terser = require('terser')
const zlib = require('zlib')
const recursiveReaddir = require('recursive-readdir')

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

const blue = (text) => `\x1b[34m${text}\x1b[39m`
const green = (text) => `\x1b[32m${text}\x1b[39m`

const measure = (bytes) => {
  const unitIndex = Math.min(Math.floor(Math.log10(bytes) / 3), UNITS.length - 1)
  bytes /= 1000 ** unitIndex

  const size = new Intl.NumberFormat().format(bytes.toFixed(2))
  const unit = UNITS[unitIndex]

  return `${size} ${unit}`
}

const minify = async (filePath) => {
  const source = fs.readFileSync(filePath, { encoding: 'utf-8' })
  if (filePath.endsWith('.d.ts')) return source

  const minified = await terser.minify(source, {
    mangle: {
      toplevel: true,
      properties: false,
    },
  })

  return minified.code
}

recursiveReaddir(path.resolve(process.cwd(), 'dist')).then((paths) => {
  ;['index.esm.js', 'index.cjs.js', 'index.d.ts'].forEach(async (name) => {
    let size = 0
    let gzip = 0

    const ext = name.replace('index', '')
    await Promise.all(
      paths.map(async (filePath) => {
        if (filePath.endsWith(ext)) {
          const code = await minify(filePath)
          size += code.length
          gzip += zlib.gzipSync(code, { level: 9 }).length
        }
      }),
    )

    console.log(`Created bundle ${blue(name)}: ${green(measure(size))} → ${green(measure(gzip))} (gzipped)`)
  })
})
