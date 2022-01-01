# opusgl

A minimal rendering library

## WebGL example

```js
import { WebGLRenderer, Scene, Geometry, Material, Color, Mesh } from 'opusgl'

const renderer = new WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const scene = new Scene()

const geometry = new Geometry({
  position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
  uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
})

const material = new Material({
  uniforms: {
    uTime: 0,
    uColor: new Color(0.3, 0.2, 0.5),
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
    uniform float uTime;
    uniform vec3 uColor;

    in vec2 vUv;
    out vec4 pc_fragColor;

    void main() {
      pc_fragColor.rgb = 0.5 + 0.3 * cos(vUv.xyx + uTime) + uColor;
      pc_fragColor.a = 1.0;
    }
  `,
})

const mesh = new Mesh(geometry, material)
scene.add(mesh)

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
})

const animate = (time) => {
  requestAnimationFrame(animate)
  material.uniforms.uTime = time / 1000
  renderer.render(scene)
}
requestAnimationFrame(animate)
```

## WebGPU example

```js
import { WebGPURenderer, Scene, Geometry, Material, Vector4, Mesh } from 'opusgl'

const renderer = new WebGPURenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const scene = new Scene()

const geometry = new Geometry({
  position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
  uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
})
const material = new Material({
  uniforms: {
    uColor: new Vector4(0.3, 0.2, 0.5, 0),
  },
  vertex: `
    struct UBO {
      uColor: vec4<f32>;
    };
    [[binding(0), group(0)]] var<uniform> uniforms: UBO;

    struct Vertex {
      [[builtin(position)]] position: vec4<f32>;
      [[location(0)]] uv: vec2<f32>;
      [[location(1)]] color: vec3<f32>;
      [[location(2)]] time: f32;
    };

    [[stage(vertex)]]
    fn main([[location(0)]] position: vec3<f32>, [[location(1)]] uv: vec2<f32>) -> Vertex {
      var vertex: Vertex;
      vertex.position = vec4<f32>(position, 1.0);
      vertex.uv = uv;
      vertex.color = vec3<f32>(uniforms.uColor.x, uniforms.uColor.y, uniforms.uColor.z);
      vertex.time = uniforms.uColor.w;

      return vertex;
    }
  `,
  fragment: `
    [[stage(fragment)]]
    fn main(
      [[location(0)]] uv: vec2<f32>,
      [[location(1)]] color: vec3<f32>,
      [[location(2)]] time: f32
    ) -> [[location(0)]] vec4<f32> {
      return vec4<f32>(0.5 + 0.3 * cos(vec3<f32>(uv, 0.0) + time) + color, 1.0);
    }
  `,
})

const mesh = new Mesh(geometry, material)
scene.add(mesh)

const animate = (time) => {
  requestAnimationFrame(animate)
  material.uniforms.uColor[3] = time / 1000
  renderer.render(scene)
}
renderer.init().then(() => requestAnimationFrame(animate))
```
