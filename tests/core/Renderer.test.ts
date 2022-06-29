import { describe, it, expect } from 'vitest'
import { Renderer, Object3D, Mesh, Geometry, Material, PerspectiveCamera } from '../../src'

class RendererImpl extends Renderer {
  render(): void {}
  compile(): void {}
}

describe('core/Renderer', () => {
  it('can sort a list of meshes by visibility', () => {
    const renderer = new RendererImpl()

    const scene = new Object3D()
    const mesh = new Mesh(new Geometry(), new Material())
    scene.add(mesh)

    expect(renderer.sort(scene).length).toBe(1)
    expect(renderer.sort(mesh).length).toBe(1)

    scene.visible = false
    expect(renderer.sort(scene).length).toBe(0)
    expect(renderer.sort(mesh).length).toBe(1)
  })

  it('can sort frustum cull a mesh', () => {
    const renderer = new RendererImpl()

    const mesh = new Mesh(
      new Geometry({
        position: {
          size: 3,
          data: new Float32Array([
            0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5,
            -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5,
            -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5,
            -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
          ]),
        },
      }),
      new Material(),
    )
    const camera = new PerspectiveCamera(45, 2)
    camera.updateProjectionMatrix(true)

    camera.position.z = 5
    camera.updateMatrix()
    mesh.updateMatrix()
    expect(renderer.sort(mesh, camera).length).toBe(1)

    camera.position.z = -5
    camera.updateMatrix()
    mesh.updateMatrix()
    expect(renderer.sort(mesh, camera).length).toBe(0)
  })
})
