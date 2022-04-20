import { Object3D } from './Object3D'
import { Matrix4 } from '../math/Matrix4'
import { Vector4 } from '../math/Vector4'
import type { Mesh } from './Mesh'

/**
 * Constructs a camera object. Can be extended to calculate projection matrices.
 */
export abstract class Camera extends Object3D {
  readonly isCamera = true
  /**
   * A projection matrix. Useful for projecting transforms.
   */
  readonly projectionMatrix = new Matrix4()
  /**
   * A world inverse matrix. Useful for aligning transforms with the camera.
   */
  readonly viewMatrix = new Matrix4()
  /**
   * A projection-view matrix. Used internally for checking whether objects are in view.
   */
  readonly projectionViewMatrix = new Matrix4()
  /**
   * Frustum clipping panes. Used to calculate a frustum representation.
   */
  readonly planes = [new Vector4(), new Vector4(), new Vector4(), new Vector4(), new Vector4(), new Vector4()]

  updateMatrix(updateChildren?: boolean, updateParents?: boolean) {
    super.updateMatrix(updateChildren, updateParents)

    this.viewMatrix.copy(this.matrix).invert()
    this.updateFrustum()
  }

  /**
   * Used internally to calculate a projection matrix.
   */
  abstract updateProjectionMatrix(): void

  /**
   * Updates camera's frustum planes.
   */
  updateFrustum() {
    const m = this.projectionViewMatrix.copy(this.projectionMatrix).multiply(this.viewMatrix)

    this.planes[0].set(m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12])
    this.planes[1].set(m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12])
    this.planes[2].set(m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13])
    this.planes[3].set(m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13])
    this.planes[4].set(m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14])
    this.planes[5].set(m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14])

    for (const plane of this.planes) {
      plane.divide(Math.sqrt(plane.x * plane.x + plane.y * plane.y + plane.z * plane.z))
    }

    return this
  }

  /**
   * Checks whether a mesh is in view.
   */
  frustumContains(mesh: Mesh) {
    const { position } = mesh.geometry.attributes
    const vertices = position.data.length / position.size

    let radius = 0

    for (let i = 0; i < vertices; i += position.size) {
      const vertexLength = Math.hypot(...position.data.slice(i, position.size))
      radius = Math.max(radius, vertexLength)
    }

    radius *= Math.max(...mesh.scale)

    for (const plane of this.planes) {
      const distance = plane.x * mesh.matrix[12] + plane.y * mesh.matrix[13] + plane.z * mesh.matrix[14] + plane.w
      if (distance <= radius) return false
    }

    return true
  }
}
