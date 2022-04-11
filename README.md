# opusgl

A minimal rendering library.

## Table of Contents

- [Install](#install)
  - [via NPM](#via-npm)
  - [via CDN](#via-cdn)
- [Examples](#examples)
  - [Rotating Cube](#rotating-cube)
  - [Fullscreen Shader](#fullscreen-shader)
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

## Examples

### Rotating Cube

Creates a rotating 3D cube with Lambert shading.

![Example Preview](/.github/screenshots/rotating-cube.gif)

<details>
  <summary>Show WebGL example</summary>

```js
import { WebGLRenderer, PerspectiveCamera, Scene, Geometry, Material, Color, Mesh } from 'opusgl'

const renderer = new WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight)
camera.position.z = 5

const scene = new Scene()

const geometry = new Geometry({
  position: {
    size: 3,
    data: new Float32Array([
      0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5,
      -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
      -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5,
      0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
    ]),
  },
  normal: {
    size: 3,
    data: new Float32Array([
      1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
      -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    ]),
  },
  uv: {
    size: 2,
    data: new Float32Array([
      0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0,
      1, 0, 0, 1, 1, 1, 0, 0, 1, 0,
    ]),
  },
  index: {
    size: 1,
    data: new Uint32Array([
      0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5, 8, 10, 9, 10, 11, 9, 12, 14, 13, 14, 15, 13, 16, 18, 17, 18, 19, 17, 20, 22,
      21, 22, 23, 21,
    ]),
  },
})

const material = new Material({
  uniforms: {
    color: new Color('hotpink'),
  },
  vertex: `
    layout(std140) uniform Uniforms {
      mat4 projectionMatrix;
      mat4 viewMatrix;
      mat4 modelMatrix;
      mat3 normalMatrix;
      vec3 color;
    };

    in vec3 position;
    in vec3 normal;
    out vec3 vNormal;
    out vec3 vColor;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vColor = color;
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
    }
  `,
  fragment: `
    in vec3 vNormal;
    in vec3 vColor;
    out vec4 pc_fragColor;

    void main() {
      vec3 normal = normalize(vNormal);
      float lighting = dot(normal, normalize(vec3(10)));

      pc_fragColor = vec4(vColor + lighting * 0.1, 1.0);
    }
  `,
})

const mesh = new Mesh(geometry, material)
scene.add(mesh)

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
})

const animate = (time) => {
  requestAnimationFrame(animate)
  mesh.rotation.z = mesh.rotation.y = time / 1500
  renderer.render(scene, camera)
}
requestAnimationFrame(animate)
```

</details>

<details>
  <summary>Show WebGPU example</summary>

```js
import { WebGPURenderer, PerspectiveCamera, Geometry, Material, Color, Mesh } from 'opusgl'

const renderer = await new WebGPURenderer().init()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight)
camera.position.z = 5

const geometry = new Geometry({
  position: {
    size: 3,
    data: new Float32Array([
      0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5,
      -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
      -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5,
      0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
    ]),
  },
  normal: {
    size: 3,
    data: new Float32Array([
      1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
      -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    ]),
  },
  uv: {
    size: 2,
    data: new Float32Array([
      0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0,
      1, 0, 0, 1, 1, 1, 0, 0, 1, 0,
    ]),
  },
  index: {
    size: 1,
    data: new Uint32Array([
      0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5, 8, 10, 9, 10, 11, 9, 12, 14, 13, 14, 15, 13, 16, 18, 17, 18, 19, 17, 20, 22,
      21, 22, 23, 21,
    ]),
  },
})

const material = new Material({
  uniforms: {
    color: new Color('hotpink'),
  },
  vertex: `
    struct Uniforms {
      projectionMatrix: mat4x4<f32>,
      modelMatrix: mat4x4<f32>,
      viewMatrix: mat4x4<f32>,
      normalMatrix: mat3x3<f32>,
      color: vec3<f32>,
    };
    @binding(0) @group(0) var<uniform> uniforms: Uniforms;

    struct VertexIn {
      @location(0) position: vec3<f32>,
      @location(1) normal: vec3<f32>,
    };

    struct VertexOut {
      @builtin(position) position: vec4<f32>,
      @location(0) color: vec3<f32>,
      @location(1) normal: vec3<f32>,
    };

    @stage(vertex)
    fn main(input: VertexIn) -> VertexOut {
      var out: VertexOut;
      out.position = uniforms.projectionMatrix * uniforms.viewMatrix * uniforms.modelMatrix * vec4<f32>(input.position, 1.0);
      out.color = uniforms.color;
      out.normal = normalize(uniforms.normalMatrix * input.normal).xyz;
      return out;
    }
  `,
  fragment: `
    struct FragmentIn {
      @location(0) color: vec3<f32>,
      @location(1) normal: vec3<f32>,
    };

    struct FragmentOut {
      @location(0) color: vec4<f32>,
    };

    @stage(fragment)
    fn main(input: FragmentIn) -> FragmentOut {
      var out: FragmentOut;
      var lighting = dot(normalize(input.normal), normalize(vec3(10.0)));
      out.color = vec4<f32>(vec3<f32>(input.color + lighting * 0.1), 1.0);
      return out;
    }
  `,
})

const mesh = new Mesh(geometry, material)

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
})

const animate = (time) => {
  requestAnimationFrame(animate)
  mesh.rotation.z = mesh.rotation.y = time / 1500
  renderer.render(mesh, camera)
}
requestAnimationFrame(animate)
```

</details>

### Fullscreen Shader

Creates an animated fullscreen gradient shader from a triangle.

![Example Preview](/.github/screenshots/fullscreen-shader.gif)

<details>
  <summary>Show WebGL example</summary>

```js
import { WebGLRenderer, Program, Color } from 'opusgl'

const renderer = new WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const program = new Program({
  attributes: {
    position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
    uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
  },
  uniforms: {
    uTime: 0,
    uColor: new Color(0x4c3380),
  },
  vertex: `
    in vec2 uv;
    in vec3 position;

    out vec2 vUv;
  
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1);
    }
  `,
  fragment: `       
    layout(std140) uniform Uniforms {
      float uTime;
      vec3 uColor;
    };

    in vec2 vUv;
    out vec4 pc_fragColor;

    void main() {
      pc_fragColor = vec4(0.5 + 0.3 * cos(vUv.xyx + uTime) + uColor, 1.0);
    }
  `,
})

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
})

const animate = (time) => {
  requestAnimationFrame(animate)
  program.uniforms.uTime = time / 1000
  renderer.render(program)
}
requestAnimationFrame(animate)
```

</details>

<details>
  <summary>Show WebGPU example</summary>

```js
import { WebGPURenderer, Program, Color } from 'opusgl'

const renderer = await new WebGPURenderer().init()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const program = new Program({
  attributes: {
    position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
    uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
  },
  uniforms: {
    time: 0,
    color: new Color(0x4c3380),
  },
  vertex: `
    struct Uniforms {
      time: f32,
      color: vec3<f32>,
    };
    @binding(0) @group(0) var<uniform> uniforms: Uniforms;

    struct VertexIn {
      @location(0) position: vec3<f32>,
      @location(1) uv: vec2<f32>,
    };

    struct VertexOut {
      @builtin(position) position: vec4<f32>,
      @location(0) color: vec4<f32>,
    };

    @stage(vertex)
    fn main(input: VertexIn) -> VertexOut {
      var out: VertexOut;
      out.color = vec4<f32>(0.5 + 0.3 * cos(vec3<f32>(input.uv, 0.0) + uniforms.time) + uniforms.color, 1.0);
      out.position = vec4<f32>(input.position, 1.0);
      return out;
    }
  `,
  fragment: `
    struct FragmentIn {
      @location(0) color: vec4<f32>,
    };

    struct FragmentOut {
      @location(0) color: vec4<f32>,
    };

    @stage(fragment)
    fn main(input: FragmentIn) -> FragmentOut {
      var out: FragmentOut;
      out.color = input.color;
      return out;
    }
  `,
})

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
})

const animate = (time) => {
  requestAnimationFrame(animate)
  program.uniforms.time = time / 1000
  renderer.render(program)
}
requestAnimationFrame(animate)
```

</details>

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
