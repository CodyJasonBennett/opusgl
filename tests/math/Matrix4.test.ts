import { Matrix4 } from '../../src'

const instance = new Array(16).fill(null).map((_, i) => i)

describe('math/Matrix3', () => {
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

  it('can add a scalar', () => {
    const matrix = new Matrix4(...instance.map(() => 0))
    matrix.add(1)

    expect(Array.from(matrix)).toStrictEqual(instance.map(() => 1))
  })

  it('can add a matrix', () => {
    const matrix = new Matrix4(...instance.map(() => 0))
    matrix.add(new Matrix4(...instance.map(() => 1)))

    expect(Array.from(matrix)).toStrictEqual(instance.map(() => 1))
  })

  it('can subtract a scalar', () => {
    const matrix = new Matrix4(...instance.map(() => 1))
    matrix.sub(1)

    expect(Array.from(matrix)).toStrictEqual(instance.map(() => 0))
  })

  it('can subtract a matrix', () => {
    const matrix = new Matrix4(...instance.map(() => 1))
    matrix.sub(new Matrix4(...instance.map(() => 1)))

    expect(Array.from(matrix)).toStrictEqual(instance.map(() => 0))
  })

  it('can multiply a scalar', () => {
    const matrix = new Matrix4(...instance.map(() => 2))
    matrix.multiply(2)

    expect(Array.from(matrix)).toStrictEqual(instance.map(() => 4))
  })

  it('can multiply a matrix', () => {
    const matrix = new Matrix4(...instance.map(() => 2))
    matrix.multiply(new Matrix4(...instance.map(() => 2)))

    expect(Array.from(matrix)).toStrictEqual(instance.map(() => 4))
  })

  it('can divide a scalar', () => {
    const matrix = new Matrix4(...instance.map(() => 4))
    matrix.divide(2)

    expect(Array.from(matrix)).toStrictEqual(instance.map(() => 2))
  })

  it('can divide a matrix', () => {
    const matrix = new Matrix4(...instance.map(() => 4))
    matrix.divide(new Matrix4(...instance.map(() => 2)))

    expect(Array.from(matrix)).toStrictEqual(instance.map(() => 2))
  })

  it('can check for equality', () => {
    const matrix = new Matrix4(...instance)

    expect(matrix.equals(matrix.clone())).toBe(true)
    expect(matrix.equals(new Matrix4())).toBe(false)
  })
})
