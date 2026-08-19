// src/models/StoreModel/NodeGraphicsStoreModel.ts
//
// Types for the node-graphics render hook: a function an external app registers
// that the host calls with each changed node, returning an image to draw as that
// node's Cytoscape.js background-image.
//
// Deliberately separate from the VisualStyle model. Hook output is renderer-only
// and must never be exported to CX2 — see
// docs/design/custom-graphics-image/node-graphics-render-hook.md.

import { IdType } from '../IdType'
import { AttributeName, ValueType } from '../TableModel'

/** How the image is fitted to the node box. Mirrors Cytoscape.js `background-fit`. */
export type NodeGraphicsFit = 'contain' | 'cover' | 'none'

/**
 * Whether the image draws under or over Cytoscape.js pie/ring charts.
 *
 * Cytoscape's node draw order is: shape → images(inside) → border → pie →
 * stripe → images(over). So `'inside'` (the default, matching Vizmapper image
 * slots) means an active pie chart covers this image. Use `'over'` to own the
 * node face.
 */
export type NodeGraphicsContainment = 'inside' | 'over'

/**
 * How the browser requests the image.
 *
 * `'null'` is a valid Cytoscape.js value meaning "do not set the crossOrigin
 * attribute" — it loads from servers without CORS headers, at the cost of
 * tainting the canvas, which excludes the image from PNG export. Use
 * `'anonymous'` when export fidelity matters more than reach.
 */
export type NodeGraphicsCrossOrigin = 'anonymous' | 'use-credentials' | 'null'

/** What the host tells the hook about the node it is asking about. */
export interface NodeGraphicsRequest {
  readonly networkId: IdType
  readonly nodeId: IdType
  /**
   * Shallow copy of the node's table row. A copy rather than the live row so an
   * app cannot mutate host state; writes to it are ignored.
   */
  readonly attributes: Record<AttributeName, ValueType>
  /** Current node width in model units, when the view model has it. */
  readonly width?: number
  readonly height?: number
}

/** A hook's full-form answer. */
export interface NodeGraphicsImage {
  /**
   * An `http(s)://` URL, a `data:` URI, or raw `<svg>` markup. `blob:` and
   * `file:` are rejected — blob URLs are dead by the time a style reapplies.
   *
   * Must be the bare URI. Values copied out of another tool's column may carry a
   * namespace prefix — STRING's `stringdb::STRING style` is
   * `string:data:image/png;base64,…` — which reads as an unrecognised scheme and
   * is discarded. Strip the prefix before returning.
   */
  readonly image: string
  /** Default `'contain'`. */
  readonly fit?: NodeGraphicsFit
  /** 0..1. Default 1. */
  readonly opacity?: number
  /**
   * Default `'null'`, which loads from hosts that send no CORS header at the cost
   * of tainting the canvas — Cytoscape then omits the image from PNG export.
   * `'anonymous'` keeps export working but fails outright on such a host, so
   * preflight a new remote source under both modes.
   */
  readonly crossOrigin?: NodeGraphicsCrossOrigin
  /** Default `'inside'`. */
  readonly containment?: NodeGraphicsContainment
}

/**
 * What a hook may return. A bare string is shorthand for `{ image }`.
 * `null` or `undefined` means "no image for this node" — the node falls back to
 * its Vizmapper custom graphic, if any.
 */
export type NodeGraphicsResult = string | NodeGraphicsImage | null | undefined

/**
 * The function an app registers.
 *
 * Synchronous by contract. An app whose image needs async work (a fetch, an
 * offscreen render) should compute and cache it in its own code, then call
 * `nodeGraphics.refresh()` so this hook can return the cached value.
 *
 * Must not throw. A throwing hook yields no image for that node, and repeated
 * throws trip a circuit breaker that stops the host calling it.
 */
export type NodeGraphicsRenderHook = (
  request: NodeGraphicsRequest,
) => NodeGraphicsResult

/** A hook plus the app that owns it. */
export interface RegisteredNodeGraphicsHook {
  readonly hookId: string
  /** `undefined` for anonymous registrations via `window.CyWebApi`. */
  readonly appId?: string
  readonly render: NodeGraphicsRenderHook
}

/**
 * A validated, fully defaulted image ready for the renderer.
 *
 * `image` has passed `normalizeImageSource`, so it is a URL or data URI — never
 * raw markup. Instances are treated as immutable and compared by reference by
 * the apply layer, so never mutate one in place.
 */
export interface ResolvedNodeGraphics {
  readonly image: string
  readonly fit: NodeGraphicsFit
  readonly opacity: number
  readonly crossOrigin: NodeGraphicsCrossOrigin
  readonly containment: NodeGraphicsContainment
  /** Hook that produced this, for attribution on hook removal. */
  readonly hookId: string
}

/** An app's request that the host re-run the hook. */
export interface NodeGraphicsRefreshRequest {
  /** Monotonic; the renderer reacts to changes, not to the value. */
  readonly token: number
  /** Undefined means the whole network. */
  readonly nodeIds?: IdType[]
}

export interface NodeGraphicsState {
  /** Registration order. First non-null result wins. */
  hooks: RegisteredNodeGraphicsHook[]
  /**
   * networkId → nodeId → resolved image.
   *
   * Ephemeral. Never persisted and never read by the CX2 exporter, which is
   * what keeps hook images out of exported files.
   */
  images: Record<IdType, Record<IdType, ResolvedNodeGraphics>>
  refreshRequests: Record<IdType, NodeGraphicsRefreshRequest>
}

export interface NodeGraphicsActions {
  /** Register or replace the hook owned by `hook.appId`. */
  setHook: (hook: RegisteredNodeGraphicsHook) => void
  /** Remove an app's hook and every image it produced. */
  removeAllByAppId: (appId: string) => void
  /** Remove the anonymous (`window.CyWebApi`) hook and its images. */
  removeAnonymousHook: () => void
  /** Merge resolved images for a network. */
  setImages: (
    networkId: IdType,
    entries: Array<[IdType, ResolvedNodeGraphics]>,
  ) => void
  /** Drop images for specific nodes, e.g. after they are deleted. */
  clearImages: (networkId: IdType, nodeIds: IdType[]) => void
  /** Drop every image and pending refresh for a network. */
  clearNetwork: (networkId: IdType) => void
  /** Ask the renderer to re-run the hook. */
  requestRefresh: (networkId: IdType, nodeIds?: IdType[]) => void
}

export type NodeGraphicsStoreModel = NodeGraphicsState & NodeGraphicsActions
