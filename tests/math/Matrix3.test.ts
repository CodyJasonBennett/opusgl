import { Matrix3 } from '../../src'

const elements = new Array(9).fill(null).map((_, i) => i)

describe('math/Matrix3', () => {
  it('can accept args', () => {
    const matrix = new Matrix3(...elements)

    expect(matrix.elements).toStrictEqual(elements)
  })

  it('can spread into an array', () => {
    const arr = [...new Matrix3()]

    expect(arr).toMatchSnapshot()
  })

  it('can copy a matrix', () => {
    const matrix = new Matrix3()
    matrix.copy(new Matrix3(...elements))

    expect(matrix.elements).toStrictEqual(elements)
  })

  it('can clone itself', () => {
    const matrix1 = new Matrix3(...elements)
    const matrix2 = matrix1.clone()

    expect(matrix2).toBeInstanceOf(Matrix3)
    expect(matrix2).not.toBe(matrix1)
    expect(matrix2.elements).toStrictEqual(elements)
  })
})
