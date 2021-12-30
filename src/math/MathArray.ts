export class MathArray {
  private _instance: Float32Array;

  *[Symbol.iterator]() {
    yield* this._instance
  }

  constructor(length: number, namedIndices = ['x', 'y', 'z', 'w']) {
    this._instance = new Float32Array(length)

    Array.from({ length }).forEach((_, index) => {
      const property = {
        get: () => this._instance[index] as number,
        set: (value: number) => (this._instance[index] = value),
      }

      Object.defineProperty(this, index, property)
      if (namedIndices) Object.defineProperty(this, namedIndices[index], property)
    })
  }
}
