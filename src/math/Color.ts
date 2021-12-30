import { extend, AnyColor, colord } from 'colord'
import names from 'colord/plugins/names'
import { MathArray } from './MathArray'

extend([names])

export type ColorRepresentation = AnyColor | number

export class Color extends MathArray {
  readonly isColor = true
  public r: number
  public g: number
  public b: number

  constructor(r: ColorRepresentation = 0xffffff, g?: number, b?: number) {
    super(3, ['r', 'g', 'b'])
    this.set(r, g, b)
  }

  set(r: ColorRepresentation, g?: number, b?: number) {
    if (typeof r === 'number' && g === undefined) {
      this.r = ((r >> 16) & 255) / 255
      this.g = ((r >> 8) & 255) / 255
      this.b = (r & 255) / 255
    } else if (typeof r === 'number') {
      this.r = r
      this.g = g
      this.b = b
    } else {
      const color = colord(r).toRgb()
      this.r = color.r
      this.g = color.g
      this.b = color.b
    }

    return this
  }

  copy(c: Color) {
    this.r = c.r
    this.g = c.g
    this.b = c.b

    return this
  }

  clone() {
    return new Color().copy(this)
  }

  equals(c: Color) {
    // prettier-ignore
    return (
      this.r === c.r &&
      this.g === c.g &&
      this.b === c.b
    )
  }
}
