let id = 0

export interface GeometryAttribute {
  data: number[]
  size?: 1 | 2 | 3 | 4
  needsUpdate?: boolean
}

export interface GeometryOptions {
  [name: string]: GeometryAttribute
}

export class Geometry {
  readonly isGeometry = true
  readonly id: number
  readonly attributes: { [name: string]: GeometryAttribute } = {}

  constructor(options?: GeometryOptions) {
    this.id = id++

    if (options) {
      Object.entries(options).forEach(([name, attribute]) => {
        this.setAttribute(name, attribute)
      })
    }
  }

  getAttribute(name: string) {
    return this.attributes[name]
  }

  hasAttribute(name: string) {
    return this.attributes.hasOwnProperty(name)
  }

  setAttribute(name: string, attribute: GeometryAttribute) {
    attribute.needsUpdate = this.hasAttribute(name)

    const size = name === 'index' ? 1 : 3
    this.attributes[name] = { size, ...attribute }
  }
}
