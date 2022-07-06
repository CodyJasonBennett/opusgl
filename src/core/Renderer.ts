import { Vector3 } from '../math/Vector3'
import { Color } from '../math/Color'
import { Mesh } from './Mesh'
import type { Object3D } from './Object3D'
import type { Camera } from './Camera'

/**
 * Represents a compilable object that implements a dispose method.
 */
export interface Disposable {
  dispose(): void
}

/**
 * A collection of disposable objects and their compiled GPU resource.
 */
export class Compiled<Compilable extends Disposable, Compiled extends Disposable> {
  private _objects = new Map<Compilable, Compiled>()

  has(object: Compilable): boolean {
    return this._objects.has(object)
  }

  get(object: Compilable): Compiled | undefined {
    return this._objects.get(object)
  }

  set(object: Compilable, compiled: Compiled): void {
    this._objects.set(object, compiled)

    const dispose = object.dispose.bind(object)
    object.dispose = (): void => {
      dispose()

      compiled.dispose()
      object.dispose = dispose
      this._objects.delete(object)
    }
  }
}

/**
 * Represents renderer viewport state.
 */
export interface Viewport {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Represents renderer scissor state.
 */
export interface Scissor {
  x: number
  y: number
  width: number
  height: number
}

const _v = new Vector3()

/**
 * Constructs a renderer object. Can be extended to draw to a canvas.
 */
export abstract class Renderer {
  /**
   * Output canvas to draw to.
   */
  public canvas!: HTMLCanvasElement
  /**
   * Output background color. Default is `0, 0, 0`.
   */
  public clearColor = new Color(0, 0, 0)
  /**
   * Output background opacity. Default is `0`.
   */
  public clearAlpha = 0

  private _pixelRatio = 1
  private _viewport: Viewport = { x: 0, y: 0, width: 0, height: 0 }
  private _scissor: Scissor = { x: 0, y: 0, width: 0, height: 0 }

  /**
   * Sets the canvas size. Will reset viewport and scissor state.
   */
  setSize(width: number, height: number): void {
    this.canvas.width = Math.floor(width * this._pixelRatio)
    this.canvas.height = Math.floor(height * this._pixelRatio)

    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`

    this.setViewport(0, 0, width, height)
    this.setScissor(0, 0, width, height)
  }

  /**
   * Gets the current pixel ratio.
   */
  get pixelRatio(): number {
    return this._pixelRatio
  }

  /**
   * Interpolates a pixel ratio and resizes accordingly.
   */
  setPixelRatio(pixelRatio: number): void {
    this._pixelRatio = pixelRatio
    this.setSize(this._viewport.width, this._viewport.height)
  }

  /**
   * Gets the current viewport state.
   */
  get viewport(): Viewport {
    return this._viewport
  }

  /**
   * Sets the global drawing region. Useful for manipulating the drawing area outside of the DOM.
   */
  setViewport(x: number, y: number, width: number, height: number): void {
    this._viewport = { x, y, width, height }
  }

  /**
   * Gets the current scissor state.
   */
  get scissor(): Scissor {
    return this._scissor
  }

  /**
   * Sets the current scissor region. Useful for rendering in a certain region.
   */
  setScissor(x: number, y: number, width: number, height: number): void {
    this._scissor = { x, y, width, height }
  }

  /**
   * Returns a list of visible meshes. Will frustum cull and depth-sort with a camera if available.
   */
  sort(scene: Object3D, camera?: Camera): Mesh[] {
    if (camera?.autoUpdate) camera.updateFrustum()

    const sorted: Mesh[] = []
    const unsorted: Mesh[] = []

    scene.traverse((node) => {
      // Skip invisible nodes
      if (!node.visible) return true

      // Filter to meshes
      const mesh = node as Mesh
      if (!(mesh instanceof Mesh)) return

      // Skip culling/sorting without camera
      if (!camera) return void unsorted.push(mesh)

      // Frustum cull if able
      if (mesh.frustumCulled) {
        const inFrustum = camera.frustumContains(mesh)
        if (!inFrustum) return true
      }

      // Filter sortable objects
      if (!mesh.material.depthTest) unsorted.push(mesh)
      else sorted.push(mesh)
    })

    // Don't depth sort without camera
    if (!camera) return unsorted

    // Depth sort if able
    return sorted
      .sort(
        (a, b) =>
          b.matrix.getPosition(_v).applyMatrix4(camera?.projectionMatrix).z -
          a.matrix.getPosition(_v).applyMatrix4(camera?.projectionMatrix).z,
      )
      .concat(unsorted)
  }

  /**
   * Compiles a mesh or program and sets initial uniforms.
   */
  abstract compile(target: Mesh, camera?: Camera): void

  /**
   * Renders a scene of objects with an optional camera.
   */
  abstract render(scene: Object3D, camera?: Camera): void
}
