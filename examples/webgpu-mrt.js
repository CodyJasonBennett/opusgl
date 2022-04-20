import { WebGPURenderer, Program, RenderTarget } from 'opusgl'

const renderer = await new WebGPURenderer().init()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const compute = new Program({
  attributes: {
    position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
  },
  vertex: `
    struct VertexIn {
      @location(0) position: vec3<f32>,
    };

    struct VertexOut {
      @builtin(position) position: vec4<f32>,
    };

    @stage(vertex)
    fn main(input: VertexIn) -> VertexOut {
      var out: VertexOut;
      out.position = vec4(input.position, 1.0);
      return out;
    }
  `,
  fragment: `
    struct FragmentOut {
      @location(0) color0: vec4<f32>,
      @location(1) color1: vec4<f32>,
      @location(2) color2: vec4<f32>,
      @location(3) color3: vec4<f32>,
    };

    @stage(fragment)
    fn main() -> FragmentOut {
      var out: FragmentOut;
      out.color0 = vec4(0.9, 0.3, 0.4, 1.0);
      out.color1 = vec4(1.0, 0.8, 0.4, 1.0);
      out.color2 = vec4(0.0, 0.8, 0.6, 1.0);
      out.color3 = vec4(0.0, 0.5, 0.7, 1.0);
      return out;
    }
  `,
})

const width = 1
const height = 1
const count = 4

const renderTarget = new RenderTarget({ width, height, count })

renderer.setRenderTarget(renderTarget)
renderer.render(compute)
renderer.setRenderTarget(null)

const composite = new Program({
  attributes: {
    position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
    uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
  },
  uniforms: {
    0: renderTarget.textures[0],
    1: renderTarget.textures[1],
    2: renderTarget.textures[2],
    3: renderTarget.textures[3],
  },
  vertex: `
    struct VertexIn {
      @location(0) position: vec3<f32>,
      @location(1) uv: vec2<f32>,
    };

    struct VertexOut {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
    };

    @stage(vertex)
    fn main(input: VertexIn) -> VertexOut {
      var out: VertexOut;
      out.position = vec4(input.position, 1.0);
      out.uv = input.uv;
      return out;
    }
  `,
  fragment: `
    @binding(0) @group(0) var sampler0: sampler;
    @binding(1) @group(0) var texture0: texture_2d<f32>;

    @binding(2) @group(0) var sampler1: sampler;
    @binding(3) @group(0) var texture1: texture_2d<f32>;

    @binding(4) @group(0) var sampler2: sampler;
    @binding(5) @group(0) var texture2: texture_2d<f32>;

    @binding(6) @group(0) var sampler3: sampler;
    @binding(7) @group(0) var texture3: texture_2d<f32>;

    struct FragmentIn {
      @location(0) uv: vec2<f32>,
    };

    struct FragmentOut {
      @location(0) color: vec4<f32>,
    };

    @stage(fragment)
    fn main(input: FragmentIn) -> FragmentOut {
      var out: FragmentOut;

      var color0 = textureSample(texture0, sampler0, input.uv);
      var color1 = textureSample(texture1, sampler1, input.uv);
      var color2 = textureSample(texture2, sampler2, input.uv);
      var color3 = textureSample(texture3, sampler3, input.uv);

      var top = mix(color0, color1, step(0.5, input.uv.x));
      var bottom = mix(color2, color3, step(0.5, input.uv.x));

      out.color = mix(bottom, top, step(0.5, input.uv.y));

      return out;
    }
  `,
})

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.render(composite)
})

renderer.render(composite)
