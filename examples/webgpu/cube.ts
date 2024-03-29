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
    data: new Uint16Array([
      0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5, 8, 10, 9, 10, 11, 9, 12, 14, 13, 14, 15, 13, 16, 18, 17, 18, 19, 17, 20, 22,
      21, 22, 23, 21,
    ]),
  },
})

const material = new Material({
  uniforms: {
    color: new Color(0xff69b4),
  },
  vertex: `
    struct Uniforms {
      projectionMatrix: mat4x4<f32>,
      modelViewMatrix: mat4x4<f32>,
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

    @vertex
    fn main(input: VertexIn) -> VertexOut {
      var out: VertexOut;
      out.position = uniforms.projectionMatrix * uniforms.modelViewMatrix * vec4(input.position, 1.0);
      out.color = uniforms.color;
      out.normal = uniforms.normalMatrix * input.normal;
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

    @fragment
    fn main(input: FragmentIn) -> FragmentOut {
      var out: FragmentOut;
      var lighting = dot(input.normal, normalize(vec3(10.0)));
      out.color = vec4(input.color + lighting * 0.1, 1.0);
      return out;
    }
  `,
})

const mesh = new Mesh(geometry, material)

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
})

function animate(time: DOMHighResTimeStamp) {
  requestAnimationFrame(animate)
  mesh.rotation.z = mesh.rotation.y = time / 1500
  renderer.render(mesh, camera)
}
requestAnimationFrame(animate)
