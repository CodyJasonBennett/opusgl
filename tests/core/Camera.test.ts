import { Camera } from '../../src'

class CameraImpl extends Camera {
  updateProjectionMatrix() {}
}

describe('core/Renderer', () => {
  it('can sort a list of meshes by visibility', () => {
    const camera = new CameraImpl()
    camera.position.set(1, 2, 3)
    camera.rotation.set(0.4)
    camera.updateMatrix()

    expect(Array.from(camera.viewMatrix)).toMatchSnapshot()
  })
})
