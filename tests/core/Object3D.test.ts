import { Object3D, Vector3 } from '../../src'

describe('core/Object3D', () => {
  it('can lookAt a Vector3 or set of points', () => {
    const object = new Object3D()

    object.lookAt(new Vector3(1, 2, 3))
    const matrix1 = Array.from(object.matrix)

    object.matrix.identity()
    object.lookAt(1, 2, 3)
    const matrix2 = Array.from(object.matrix)

    expect(matrix1).toMatchSnapshot()
    expect(matrix1).toStrictEqual(matrix2)
  })

  it('can recursively update local and world matrices', () => {
    const parent = new Object3D()
    parent.position.set(1, 2, 3)
    parent.rotation.set(0.4)

    const child = new Object3D()
    child.position.set(4, 5, 6)
    child.rotation.set(-0.4)
    parent.add(child)

    parent.updateMatrix()

    expect(Array.from(parent.matrix)).toMatchSnapshot()
    expect(Array.from(child.matrix)).toMatchSnapshot()
  })
})
