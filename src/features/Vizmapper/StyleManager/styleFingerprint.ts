/**
 * Content fingerprint for a visual style, used to spot styles that are copies of
 * each other.
 *
 * Why the picker needs this: copying a style in is a copy, not a reference, so a
 * workspace accumulates duplicates. Copy network B's style into A, and from then
 * on B's own picker lists A's copy of B's style right next to B's original —
 * identical thumbnail, identical everything, and nothing to distinguish them.
 * The more the picker is used, the worse it gets.
 *
 * Goes through `serializeVisualStyle` rather than JSON.stringify directly:
 * bypasses and discrete mappings are Maps, which stringify to `{}` and would
 * make styles differing only in their mappings look identical.
 *
 * This detects COPIES, not semantic equivalence — two styles built separately to
 * look the same may serialize with different key order and fingerprint
 * differently. That is the right bias here: the duplicates worth suppressing are
 * the ones this feature itself created, and a false "these are the same" would
 * hide a style the user still needs.
 */
import { serializeVisualStyle } from '../../../data/db/serialization/mapSerialization'
import { VisualStyle } from '../../../models/VisualStyleModel'

/**
 * Keyed by the style object, so a fingerprint is computed at most once per style
 * per session. Immer replaces the object on every mutation, so an edited style
 * is a natural miss — the same property the thumbnail cache relies on.
 */
const cache = new WeakMap<VisualStyle, string>()

export const styleFingerprint = (visualStyle: VisualStyle): string => {
  const hit = cache.get(visualStyle)
  if (hit !== undefined) {
    return hit
  }
  const fingerprint = JSON.stringify(serializeVisualStyle(visualStyle))
  cache.set(visualStyle, fingerprint)
  return fingerprint
}
