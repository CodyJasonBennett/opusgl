# opusgl

A minimal rendering library.

## Table of Contents

- [Install](#install)
  - [via NPM](#via-npm)
  - [via CDN](#via-cdn)
- [Contributing](#contributing)
  - [Development](#development)
  - [Publishing](#publishing)

## Install

This assumes you already have [Node](https://nodejs.org) installed and a build system configured. If you're just getting started, I'd recommend using [Vite](https://vitejs.dev) or [Codesandbox](https://codesandbox.io) and continuing with NPM.

### via NPM

Install from NPM with:

```bash
npm install opusgl
# or, if you use Yarn
yarn add opusgl
```

### via CDN

If you'd prefer to not use build tools and use a CDN, I'd recommend [Skypack](https://skypack.dev) as it bundles things for you.

Make sure you specify a fixed version (`opusgl@0.0.0`) so your code doesn't break down the line.

```html
<script type="module">
  import { WebGLRenderer, Program, Vector3, Color } from 'https://cdn.skypack.dev/opusgl'
</script>
```

## Contributing

This project uses [semantic commits](https://conventionalcommits.org) and [semver](https://semver.org).

Make sure you have [Node](https://nodejs.org) and [Yarn](https://yarnpkg.com) and installed. Install dependencies with:

```bash
yarn
```

### Development

Locally run examples against the library with:

```bash
yarn dev
```

### Publishing

To publish a release on NPM, run the following and follow the dialog:

```bash
yarn release
```
