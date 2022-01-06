import { Matrix3 } from '../../src'

const instance = new Array(9).fill(null).map((_, i) => i)

describe('math/Matrix3', () => {
  it('can accept args', () => {
    const matrix = new Matrix3(...instance)

    expect(Array.from(matrix)).toMatchSnapshot()
  })

  it('can copy a matrix', () => {
    const matrix = new Matrix3()
    matrix.copy(new Matrix3(...instance))

    expect(Array.from(matrix)).toMatchSnapshot()
  })

  it('can clone itself', () => {
    const matrix1 = new Matrix3(...instance)
    const matrix2 = matrix1.clone()

    expect(matrix2).toBeInstanceOf(Matrix3)
    expect(matrix2).not.toBe(matrix1)
    expect(Array.from(matrix2)).toMatchSnapshot()
  })

  it('can multiply a scalar', () => {
    const matrix = new Matrix3(...instance.map(() => 2))
    matrix.multiply(2)

    expect(Array.from(matrix)).toMatchSnapshot()
  })

  it('can multiply a matrix', () => {
    const matrix = new Matrix3(...instance.map(() => 2))
    matrix.multiply(new Matrix3(...instance.map(() => 2)))

    expect(Array.from(matrix)).toMatchSnapshot()
  })

  it('can check for equality', () => {
    const matrix = new Matrix3(...instance)

    expect(matrix.equals(new Matrix3(...instance))).toBe(true)
    expect(matrix.equals(new Matrix3())).toBe(false)
  })
})
