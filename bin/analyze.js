#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const terser = require('terser')
const zlib = require('zlib')
const recursiveReaddir = require('recursive-readdir')

const DIST_DIR = path.resolve(process.cwd(), 'dist')
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

recursiveReaddir(DIST_DIR).then(async (paths) => {
  const exts = ['.esm.js', '.cjs.js', '.d.ts']
  const bundles = exts.reduce((acc, ext) => ({ ...acc, [ext]: { name: `index${ext}`, size: 0 } }), {})

  const files = await Promise.all(
    paths.map(async (filePath) => {
      const ext = exts.find((ext) => filePath.endsWith(ext))
      if (!ext) return

      const code = await minify(filePath)

      const name = filePath.replace(DIST_DIR, 'src').replace(ext, '.ts')
      const size = zlib.brotliCompressSync(code).length

      bundles[ext].size += size

      return { ext, name, size }
    }),
  )

  files
    .filter((file) => file?.ext === '.esm.js')
    .sort((a, b) => b.size - a.size)
    .forEach((file) => {
      console.log(`${blue(file.name)}: ${green(measure(file.size))}`)
    })

  Object.values(bundles).forEach((bundle) => {
    console.log(`Created bundle ${blue(`dist${path.sep}${bundle.name}`)}: ${green(measure(bundle.size))}`)
  })
})
