import { WebGPURenderer, PerspectiveCamera, Geometry, Material, Mesh } from 'opusgl'

const renderer = await new WebGPURenderer().init()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight)
camera.position.z = 10

const geometry = new Geometry({
  position: {
    size: 3,
    data: new Float32Array([
      // bottom left quad
      0, 0, -1, -2, 0, -1, -2, -2, -1, 0, 0, -1, -2, -2, -1, 0, -2, -1,
      // center quad
      1, 1, 0, -1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0,
      // top right quad
      2, 2, 1, 0, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 0, 1,
    ]),
  },
  color: {
    size: 3,
    data: new Float32Array([
      // red
      1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
      // yellow
      1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0,
      // blue
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    ]),
  },
})

const material = new Material({
  transparent: true,
  vertex: `
    struct Uniforms {
      projectionMatrix: mat4x4<f32>,
      modelViewMatrix: mat4x4<f32>,
    };
    @binding(0) @group(0) var<uniform> uniforms: Uniforms;

    struct VertexIn {
      @location(0) position: vec2<f32>,
      @location(1) color: vec3<f32>,
    };

    struct VertexOut {
      @builtin(position) position: vec4<f32>,
      @location(0) color: vec3<f32>,
    };

    @vertex
    fn main(input: VertexIn) -> VertexOut {
      var out: VertexOut;
      out.position = uniforms.projectionMatrix * uniforms.modelViewMatrix * vec4(input.position, 0.0, 1.0);
      out.color = input.color;
      return out;
    }
  `,
  fragment: `
    struct FragmentIn {
      @location(0) color: vec3<f32>,
    };

    struct FragmentOut {
      @location(0) color: vec4<f32>,
    };

    @fragment
    fn main(input: FragmentIn) -> FragmentOut {
      var out: FragmentOut;
      out.color = vec4(input.color, 0.5);
      return out;
    }
  `,
})

const mesh = new Mesh(geometry, material)
mesh.frustumCulled = false

const handleResize = () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.render(mesh, camera)
}
window.addEventListener('resize', handleResize)
handleResize()
