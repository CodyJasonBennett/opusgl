import { WebGLRenderer, Program, Texture } from 'opusgl'

const renderer = new WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.canvas)

const program = new Program({
  attributes: {
    position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
    uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
  },
  uniforms: {
    time: 0,
    texture: await new Texture().fromData(new Uint8Array([76, 51, 128, 255]), 1, 1),
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
      float time;
    };
    uniform sampler2D test;

    in vec2 vUv;
    out vec4 pc_fragColor;

    void main() {
      pc_fragColor = vec4(0.5 + 0.3 * cos(vUv.xyx + time), 0.0) + texture(test, vUv);
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
