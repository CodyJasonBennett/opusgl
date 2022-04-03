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
