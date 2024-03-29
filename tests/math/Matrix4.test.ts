import { describe, it, expect } from 'vitest'
import { Euler, Matrix4, Quaternion, Vector3 } from '../../src'

const instance = new Array(16).fill(null).map((_, i) => i)

describe('math/Matrix4', () => {
  it('can accept args', () => {
    const matrix = new Matrix4(...instance)

    expect(Array.from(matrix)).toMatchSnapshot()
  })

  it('can copy a matrix', () => {
    const matrix = new Matrix4()
    matrix.copy(new Matrix4(...instance))

    expect(Array.from(matrix)).toMatchSnapshot()
  })

  it('can clone itself', () => {
    const matrix1 = new Matrix4(...instance)
    const matrix2 = matrix1.clone()

    expect(matrix2).toBeInstanceOf(Matrix4)
    expect(matrix2).not.toBe(matrix1)
    expect(Array.from(matrix2)).toMatchSnapshot()
  })

  it('can multiply a scalar', () => {
    const matrix = new Matrix4(...instance.map(() => 2))
    matrix.multiply(2)

    expect(Array.from(matrix)).toMatchSnapshot()
  })

  it('can multiply a matrix', () => {
    const matrix = new Matrix4(...instance.map(() => 2))
    matrix.multiply(new Matrix4(...instance.map(() => 2)))

    expect(Array.from(matrix)).toMatchSnapshot()
  })

  it('can check for equality', () => {
    const matrix = new Matrix4(...instance)

    expect(matrix.equals(matrix.clone())).toBe(true)
    expect(matrix.equals(new Matrix4())).toBe(false)
  })

  it('can be set from perspective', () => {
    const matrixGL = new Matrix4().perspective(60, 0, 0.1, 10, true)
    const matrixGPU = new Matrix4().perspective(60, 0, 0.1, 10, false)

    expect(matrixGL).toMatchSnapshot()
    expect(matrixGPU).toMatchSnapshot()
  })

  it('can be set from orthogonal', () => {
    const matrixGL = new Matrix4().orthogonal(-1, 1, -1, 1, 0, 10, true)
    const matrixGPU = new Matrix4().orthogonal(-1, 1, -1, 1, 0, 10, false)

    expect(matrixGL).toMatchSnapshot()
    expect(matrixGPU).toMatchSnapshot()
  })

  it('can lookAt a set of vectors', () => {
    const eye = new Vector3(0, 0, 5)
    const target = new Vector3()
    const up = new Vector3(0, 1, 0)
    const matrix = new Matrix4().lookAt(eye, target, up)

    expect(matrix).toMatchSnapshot()
  })

  it('can compose from a set of properties', () => {
    const position = new Vector3(1, 2, 3)
    const quaternion = new Quaternion().fromEuler(new Euler(Math.PI))
    const scale = new Vector3(1)
    const matrix = new Matrix4().compose(position, quaternion, scale)

    expect(Array.from(matrix)).toMatchSnapshot()
  })

  it('can decompose to a set of properties', () => {
    const position = new Vector3()
    const quaternion = new Quaternion()
    const scale = new Vector3()
    new Matrix4().decompose(position, quaternion, scale)

    expect(Array.from(position)).toMatchSnapshot()
    expect(Array.from(quaternion)).toMatchSnapshot()
    expect(Array.from(scale)).toMatchSnapshot()
  })
})
