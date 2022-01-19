import { uuid, dispose } from '../utils'

export interface GeometryAttribute {
  data: Float32Array | Uint16Array
  size: 1 | 2 | 3 | 4
  needsUpdate?: boolean
}

export interface GeometryOptions {
  [name: string]: GeometryAttribute
}

export class Geometry {
  readonly isGeometry = true
  readonly uuid: string
  readonly attributes: { [name: string]: GeometryAttribute } = {}

  constructor(options?: GeometryOptions) {
    this.uuid = uuid()

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
    this.attributes[name] = attribute
  }
}
