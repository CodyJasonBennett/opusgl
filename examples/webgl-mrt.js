import { WebGLRenderer, Program, RenderTarget } from 'opusgl'

const renderer = new WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const compute = new Program({
  mode: 'points',
  attributes: {
    index: { size: 1, data: new Uint32Array(1) },
  },
  vertex: `
    void main() {
      gl_PointSize = 1.0;
      gl_Position = vec4(0, 0, 0, 1);
    }
  `,
  fragment: `
    layout(location = 0) out vec4 color0;
    layout(location = 1) out vec4 color1;
    layout(location = 2) out vec4 color2;
    layout(location = 3) out vec4 color3;

    void main() {
      color0 = vec4(0.9, 0.3, 0.4, 1.0);
      color1 = vec4(1.0, 0.8, 0.4, 1.0);
      color2 = vec4(0.0, 0.8, 0.6, 1.0);
      color3 = vec4(0.0, 0.5, 0.7, 1.0);
    }
  `,
})

const width = 1
const height = 1
const count = 4
const samples = 4

const renderTarget = new RenderTarget({ width, height, count, samples })

renderer.setRenderTarget(renderTarget)
renderer.render(compute)
renderer.blitRenderTarget(renderTarget)

const { gl } = renderer
for (let i = 0; i < count; i++) {
  gl.readBuffer(gl.COLOR_ATTACHMENT0 + i)
  const pixel = new Uint8Array(4)
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  console.log(pixel)
}
renderer.setRenderTarget(null)

const composite = new Program({
  attributes: {
    position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
    uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
  },
  uniforms: {
    textures: renderTarget.textures,
  },
  vertex: `
    in vec3 position;
    in vec2 uv;

    out vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragment: `
    uniform sampler2D textures[4];

    in vec2 vUv;
    out vec4 pc_fragColor;

    void main() {
      vec4 color0 = texture(textures[0], vUv);
      vec4 color1 = texture(textures[1], vUv);
      vec4 color2 = texture(textures[2], vUv);
      vec4 color3 = texture(textures[3], vUv);

      vec4 top = mix(color0, color1, step(0.5, vUv.x));
      vec4 bottom = mix(color2, color3, step(0.5, vUv.x));

      pc_fragColor = mix(bottom, top, step(0.5, vUv.y));
    }
  `,
})

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.render(composite)
})

renderer.render(composite)
