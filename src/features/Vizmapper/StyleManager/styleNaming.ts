/**
 * Naming rules for the style picker.
 *
 * A CX2 network that expresses one style in the standard aspects gets that style
 * registered as DEFAULT_STYLE_NAME, so in a workspace of ten networks every
 * single one owns a style called "Default". The name is then pure noise: it
 * cannot tell two styles apart, and the network is the only thing that
 * identifies them.
 *
 * Renaming those styles where they are stored is NOT an option — the CX2
 * exporter omits the `cyWebVisualStyles` aspect precisely when a network has one
 * style named "Default" (MULTIPLE_VISUAL_STYLES.md §4), so renaming on load
 * would force that aspect into every export and make every document bigger for
 * no gain. These helpers therefore resolve names at display and copy time
 * instead, leaving stored data alone.
 */
import { DEFAULT_STYLE_NAME } from '../../../models/VisualStyleModel/VisualStyleSet'

/**
 * True for a name that carries no information about the style — "Default", or
 * one of the de-duplicated variants `uniqueStyleName` derives from it
 * ("Default 2", "Default 3", …).
 *
 * A user who deliberately types "Default 2" gets treated as generic too. That
 * costs them nothing: the only consequence is a copy named after its source
 * network, which is still the more useful of the two names.
 */
export const isGenericStyleName = (name: string): boolean =>
  new RegExp(`^${DEFAULT_STYLE_NAME}( \\d+)?$`).test(name.trim())

/**
 * Name for a style copied into the current network from `sourceName` (another
 * network, or a library template).
 *
 * A meaningful name is kept — a copy of "Big Labels" is still "Big Labels". A
 * generic one is replaced by the source, because otherwise the copy lands as
 * yet another "Default 2" and every trace of where it came from is gone the
 * moment it arrives. This is what Cytoscape Desktop's names do in practice
 * ("galFiltered Style", "CV_DMV_systems_map").
 *
 * Collisions are not handled here: `importStyle` runs the result through
 * `uniqueStyleName`, so two copies from one network become "X" and "X 2".
 */
export const copiedStyleName = (
  styleName: string,
  sourceName: string,
): string => {
  if (!isGenericStyleName(styleName)) {
    return styleName
  }
  // Falls back to the generic name when there is no source to borrow from,
  // rather than producing an empty style name.
  return sourceName.trim() === '' ? styleName : sourceName.trim()
}
