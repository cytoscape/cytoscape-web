import { IdType } from '../IdType'
import { VisualStyle } from './VisualStyle'

/**
 * Name given to the initial style of a network when no explicit
 * name is available (e.g. single-style CX2 documents, legacy DB rows).
 */
export const DEFAULT_STYLE_NAME = 'Default'

/**
 * Upper bound on the number of named styles a network may own.
 * Enforced both when creating styles locally (store actions) and when
 * importing the cyWebVisualStyles CX2 aspect, so a set that can be created
 * can always round-trip through NDEx.
 */
export const MAX_STYLES_PER_NETWORK = 50

/**
 * A visual style with identity, usable as one of several
 * named styles owned by a network.
 */
export interface NamedVisualStyle {
  readonly id: IdType
  readonly name: string
  readonly visualStyle: VisualStyle
}

/**
 * The complete set of named visual styles owned by a single network,
 * plus the pointer to the currently active (rendered/edited) style.
 *
 * Invariants:
 * - `styles` contains at least one entry
 * - `activeStyleId` is a key of `styles`
 * - each entry's `id` equals its key in `styles`
 */
export interface VisualStyleSet {
  readonly activeStyleId: IdType
  readonly styles: Record<IdType, NamedVisualStyle>
}

/**
 * A reusable style template stored in the workspace-level style library.
 * Templates are copied into a network's style set when applied
 * (copy-on-assign) — they are never referenced live.
 *
 * Templates never carry bypasses: bypass entries reference element ids
 * of a specific network and are meaningless outside of it.
 */
export interface StyleTemplate {
  readonly id: IdType
  readonly name: string
  readonly visualStyle: VisualStyle
}
