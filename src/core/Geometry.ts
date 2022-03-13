import { uuid } from '../utils'
import type { Attribute } from './Program'

/**
 * Geometry constructor parameters. Accepts an object of program attributes.
 */
export interface GeometryOptions {
  [name: string]: Attribute
}

/**
 * Constructs a geometry object. Used to store program attributes.
 */
export class Geometry {
  readonly isGeometry = true
  readonly uuid: string
  readonly attributes: { [name: string]: Attribute } = {}

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
  setAttribute(name: string, attribute: Attribute) {
    attribute.needsUpdate = this.hasAttribute(name)
    this.attributes[name] = attribute
  }

  /**
   * Disposes geometry from GPU memory.
   */
  dispose() {
    // Implemented by renderer
  }
}
