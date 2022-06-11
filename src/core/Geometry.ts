import { uuid } from '../utils'

export type AttributeData =
  | Float32Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Uint32Array

/**
 * Represents a buffer attribute.
 */
export interface Attribute {
  /**
   * Attribute data view.
   */
  data: AttributeData
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
 * Represents a list of attributes.
 */
export interface AttributeList {
  [name: string]: Attribute
}

/**
 * Constructs a geometry object. Used to store program attributes.
 */
export class Geometry {
  readonly uuid: string
  readonly attributes: AttributeList = {}

  constructor(attributes?: AttributeList) {
    this.uuid = uuid()

    for (const name in attributes) {
      this.setAttribute(name, attributes[name])
    }
  }

  /**
   * Gets an attribute by name.
   */
  getAttribute(name: string) {
    return this.attributes[name]
  }

  /**
   * Sets an attribute by name. Will update existing attributes.
   */
  setAttribute(name: string, attribute: Attribute) {
    attribute.needsUpdate = !!this.attributes[name]
    this.attributes[name] = attribute
  }

  /**
   * Disposes geometry from GPU memory.
   */
  dispose() {
    // Implemented by renderer
  }
}
