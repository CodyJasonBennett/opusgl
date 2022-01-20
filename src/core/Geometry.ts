import { uuid, dispose } from '../utils'

/**
 * Represents a Geometry attribute. Passed as a buffer attribute to shader programs.
 */
export interface GeometryAttribute {
  /**
   * Attribute data.
   */
  data: Float32Array | Uint16Array
  /**
   * The size (per vertex) of the data array. Used to allocate data to each vertex.
   */
  size: 1 | 2 | 3 | 4
  /**
   * Used internally to mark attribute for updates.
   */
  needsUpdate?: boolean
}

/**
 * Geometry constructor parameters. Accepts an object of GeometryAttributes.
 */
export interface GeometryOptions {
  [name: string]: GeometryAttribute
}

/**
 * Constructs a geometry object. Used to store GeometryAttributes.
 */
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

  /**
   * Gets an attribute by name.
   */
  getAttribute(name: string) {
    return this.attributes[name]
  }

  /**
   * Checks whether an attribute is defined.
   */
  hasAttribute(name: string) {
    return this.attributes.hasOwnProperty(name)
  }

  /**
   * Sets an attribute by name. Will update existing attributes.
   */
  setAttribute(name: string, attribute: GeometryAttribute) {
    attribute.needsUpdate = this.hasAttribute(name)
    this.attributes[name] = attribute
  }

  /**
   * Disposes geometry from GPU memory.
   */
  dispose() {
    dispose(this.uuid)
  }
}
