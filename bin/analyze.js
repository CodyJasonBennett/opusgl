#!/usr/bin/env node

const path = require('path')
const fs = require('fs')
const prettyBytes = require('pretty-bytes')
const gzipSize = require('gzip-size')
const recursiveReaddir = require('recursive-readdir')

const args = process.argv.slice(2)
const verbose = args.includes('--verbose')

const DIST_DIR = path.resolve(process.cwd(), 'dist')

const green = (text) => `\x1b[32m${text}\x1b[39m`
const blue = (text) => `\x1b[34m${text}\x1b[39m`

const format = (name, size, gzip) =>
  `${blue(name)}: ${green(prettyBytes(size))} → ${green(prettyBytes(gzip))} (gzipped)`

const measureBundle = (ext, paths) =>
  paths.reduce(
    (acc, filePath) => {
      if (filePath.endsWith(ext)) {
        const code = fs.readFileSync(filePath)
        const size = code.length
        const gzip = gzipSize.sync(code)

        acc.size += size
        acc.gzip += gzip

        if (verbose) {
          const name = filePath.replace(DIST_DIR, 'dist')
          console.log(format(name, size, gzip))
        }
      }

      return acc
    },
    { size: 0, gzip: 0 },
  )

recursiveReaddir(DIST_DIR).then((paths) => {
  ;['index.esm.js', 'index.cjs.js', 'index.d.ts'].forEach((name) => {
    const ext = name.replace('index', '')
    const { size, gzip } = measureBundle(ext, paths)
    console.log(`Created bundle ${format(name, size, gzip)}`)
  })
})
