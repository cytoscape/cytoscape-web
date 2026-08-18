// src/features/NetworkPanel/CyjsRenderer/nodeGraphicsApply.ts
//
// Writes app-supplied node images into Cytoscape.js as ELEMENT-LEVEL STYLE
// BYPASSES (`node.style()`), not as element data.
//
// This is the only place in the repo that calls `ele.style()`, and that is
// deliberate. The rest of the renderer drives every visual property through
// `ele.data()` plus one shared stylesheet, but neither works here:
//
//   1. The `background-image` stylesheet mapper only exists when the visual
//      style has a usable custom-graphics slot (`getFirstValidCustomGraphicVp`
//      gate, cyjsRenderUtil.ts:291). A hook must work regardless of the user's
//      Vizmapper setup, so it cannot depend on that mapper existing.
//   2. `updateCyElements` removes stale custom-graphics keys on every pass
//      (cyjsRenderUtil.ts:528-533), and `SpecialPropertyName.BackgroundImage` is
//      in that list. A hook-written `data('backgroundImage', …)` would be wiped
//      by the next `applyViewModel`.
//
// A bypass avoids both by not participating in either mechanism, and it survives
// a stylesheet swap. Verified in node_modules/cytoscape/dist/cytoscape.cjs.js:
//   - `corefn.style(newSheet)` → `setStyle` → `_Style.fromJson` installs a new
//     Style object and never calls `cleanElements` (:19259-19278).
//   - `cleanElements(eles, true)` is reached only from `styfn.clear` (:19140),
//     which this app never calls, and it preserves bypass props anyway
//     (:16547-16570).
//   - Reapplying a stylesheet value over an existing bypass keeps the bypass and
//     stores the stylesheet value underneath as `bypassed` (:16535-16538) — this
//     is also why the hook wins over a Vizmapper image for free.
//
// It is also what keeps hook images out of CX2: the exporter reads `CyNetwork`
// fields, and this never touches `VisualStyle`, `NetworkView`, or `ele.data()`.

import { Core } from 'cytoscape'

import { logUi } from '../../../debug'
import type { IdType } from '../../../models/IdType'
import type { ResolvedNodeGraphics } from '../../../models/StoreModel/NodeGraphicsStoreModel'
import { wrapSvgDataUriForSize } from '../../../models/VisualStyleModel/impl/imageSourceImpl'

/**
 * Space-separated property list for `removeStyle`. Must cover every property
 * `applyNodeGraphics` sets, or clearing a hook would leave a partial bypass.
 */
const HOOK_STYLE_PROPS = [
  'background-image',
  'background-fit',
  'background-image-opacity',
  'background-image-crossorigin',
  'background-image-containment',
].join(' ')

/**
 * Overlay last applied to each cy instance, so the next apply can be a diff.
 *
 * A WeakMap rather than store state: this is a fact about a specific
 * Cytoscape.js instance, it must not survive that instance, and it must not be
 * observable by anything that serializes.
 */
const applied = new WeakMap<Core, Record<IdType, ResolvedNodeGraphics>>()

/**
 * Forget what was applied to `cy`.
 *
 * Call after a full teardown (`cy.remove('*')`), where the elements holding the
 * bypasses are gone. Without this the next apply would diff against a stale
 * overlay and skip nodes it must repaint.
 */
export const resetNodeGraphics = (cy: Core): void => {
  applied.delete(cy)
}

/** SVG data URIs get wrapped to the node's box; other URLs pass through. */
const resolveImageForNode = (
  image: string,
  width: number,
  height: number,
): string => {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return image
  if (width <= 0 || height <= 0) return image
  return wrapSvgDataUriForSize(image, width, height)
}

/**
 * Apply `next` as the complete set of hook images for `cy`.
 *
 * Diff-based and idempotent: only nodes whose image was added, changed, or
 * removed are touched, so calling this on every restyle costs nothing when
 * nothing changed. Nodes absent from both the previous and next overlay are
 * never touched at all — this must not disturb Vizmapper-styled nodes.
 *
 * MUST be called after `cy.style(...)`, never before: `node.width()` and
 * `node.height()` feed the SVG size wrapper and only report correct values once
 * the new stylesheet is installed.
 *
 * @param cy - The Cytoscape.js instance
 * @param next - nodeId → image. Omit or pass `{}` to clear every hook image.
 */
export const applyNodeGraphics = (
  cy: Core,
  next: Record<IdType, ResolvedNodeGraphics> = {},
): void => {
  const prev = applied.get(cy) ?? {}

  const touched = new Set<IdType>([...Object.keys(prev), ...Object.keys(next)])
  if (touched.size === 0) return

  cy.startBatch()
  try {
    for (const nodeId of touched) {
      const graphics = next[nodeId]

      // A node can disappear between the hook running and this apply.
      const node = cy.getElementById(nodeId)
      if (node.empty()) continue

      if (graphics === undefined) {
        // Dropping the bypass lets the Vizmapper mapper (if any) reassert
        // itself, leaving no residue in the user's saved style.
        node.removeStyle(HOOK_STYLE_PROPS)
        continue
      }

      // ResolvedNodeGraphics instances are immutable, so reference equality is
      // a sound "nothing to do" test.
      if (prev[nodeId] === graphics) continue

      node.style({
        'background-image': resolveImageForNode(
          graphics.image,
          node.width(),
          node.height(),
        ),
        'background-fit': graphics.fit,
        'background-image-opacity': graphics.opacity,
        'background-image-crossorigin': graphics.crossOrigin,
        'background-image-containment': graphics.containment,
      })
    }
  } catch (e) {
    // A malformed value must not break the frame. The overlay is still recorded
    // below so the next apply does not retry the same failing write forever.
    logUi.warn('[nodeGraphics]: failed to apply node graphics', e)
  } finally {
    cy.endBatch()
  }

  applied.set(cy, next)
}
