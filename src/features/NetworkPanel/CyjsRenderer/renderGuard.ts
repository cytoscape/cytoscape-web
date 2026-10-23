/**
 * renderGuard.ts
 *
 * Decides when CyjsRenderer must redraw a network in full and when an update
 * in place is enough (#861).
 *
 * `renderNetwork` removes every element and adds it back. It is needed only
 * when the Cytoscape.js instance does not show the network yet, or the
 * network's topology changed since it was drawn. Style, table and visual
 * editor changes are applied in place by `onStyleModelUpdate`, and it needs to
 * know which inputs the elements on screen were already styled from.
 *
 * Topology changes are detected with `NetworkStore.topologyVersions`, which
 * every topology action bumps. Networks are mutated in place, so their identity
 * never changes, and element counts miss a replacement of as many elements as
 * were removed.
 */
import type { Core } from 'cytoscape'

import { IdType } from '../../../models/IdType'
import type { TableRecord } from '../../../models/StoreModel/TableStoreModel'
import type { VisualStyle } from '../../../models/VisualStyleModel'
import type { VisualEditorProperties } from '../../../models/VisualStyleModel/VisualStyleOptions'

/**
 * The network a Cytoscape.js instance shows, recorded when a full render
 * completes. The instance is part of it: a StrictMode remount creates a new,
 * empty one.
 */
export interface RenderedNetwork {
  readonly cy: Core
  readonly networkId: IdType
  /** `NetworkStore.topologyVersions` for the network when it was drawn. */
  readonly topologyVersion: number | undefined
}

/** What the elements on screen were last styled from. */
export interface StyleInputs {
  readonly visualStyle: VisualStyle
  readonly table: TableRecord
  readonly visualEditorProperties: VisualEditorProperties | undefined
}

/** True when `cy` was last rendered with the network `networkId`. */
export const isShowing = (
  rendered: RenderedNetwork | null,
  cy: Core,
  networkId: IdType,
): boolean =>
  rendered !== null && rendered.cy === cy && rendered.networkId === networkId

/**
 * True when a full render would redraw what `cy` already shows: it was drawn
 * with this network, and the network's topology has not changed since.
 *
 * A constant-time check, so it costs nothing on large networks however often
 * the render triggers fire.
 */
export const isNetworkOnScreen = (
  rendered: RenderedNetwork | null,
  cy: Core,
  networkId: IdType,
  topologyVersion: number | undefined,
): boolean =>
  isShowing(rendered, cy, networkId) &&
  rendered?.topologyVersion === topologyVersion

/**
 * True when `next` holds the same inputs as `applied`. The stores replace these
 * objects on every change, so identity is enough.
 */
export const isSameStyleInputs = (
  applied: StyleInputs | null,
  next: StyleInputs,
): boolean =>
  applied !== null &&
  applied.visualStyle === next.visualStyle &&
  applied.table === next.table &&
  applied.visualEditorProperties === next.visualEditorProperties
