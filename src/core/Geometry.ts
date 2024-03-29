/**
 * Represents an attribute data view.
 */
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
 * Represents a geometry attribute.
 */
export interface Attribute {
  /**
   * Attribute data view.
   */
  data: AttributeData
  /**
   * The size (per vertex) of the data array. Used to allocate data to each vertex.
   */
  size: number
  /**
   * The size (per instance) of the data array. Used to allocate data to each instance.
   */
  divisor?: number
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
  readonly attributes: AttributeList = {}

  constructor(attributes?: AttributeList) {
    for (const key in attributes) {
      this.attributes[key] = attributes[key]
      this.attributes[key].needsUpdate = true
    }
  }

  /**
   * Disposes geometry from GPU memory.
   */
  dispose(): void {
    // Implemented by renderer
  }
}
