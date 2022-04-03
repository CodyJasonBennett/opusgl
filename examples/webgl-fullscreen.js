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
    time: 0,
    color: new Color(0x4c3380),
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
      vec3 color;
    };

    in vec2 vUv;
    out vec4 pc_fragColor;

    void main() {
      pc_fragColor = vec4(0.5 + 0.3 * cos(vUv.xyx + time) + color, 1.0);
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
