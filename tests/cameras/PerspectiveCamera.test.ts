import { PerspectiveCamera } from '../../src'

describe('cameras/PerspectiveCamera', () => {
  it('can calculate a perspective projection matrix', () => {
    const camera = new PerspectiveCamera()
    camera.updateProjectionMatrix()
    expect(Array.from(camera.projectionMatrix)).toMatchSnapshot()
  })
})
