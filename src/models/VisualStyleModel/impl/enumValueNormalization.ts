/**
 * Normalize free-text enum values (node shape, edge/border line type) to the
 * canonical Cytoscape Web values.
 *
 * Passthrough mappings created in Cytoscape Desktop point at a column whose
 * values are the shape / line-type names as the user typed them (e.g.
 * "Diamond", "DASHED", "Round Rectangle", "EQUAL_DASH"). Cytoscape Web's enums
 * are lower-case, hyphenated tokens, so the raw column value never matches and
 * the mapping appears to do nothing (CW-517). This helper reconciles common
 * case / separator / alias differences.
 */
import { EdgeLineType } from '../VisualPropertyValue/EdgeLineType'
import { NodeBorderLineType } from '../VisualPropertyValue/NodeBorderLineType'
import { NodeShapeType } from '../VisualPropertyValue/NodeShapeType'
import { VisualPropertyValueType } from '../VisualPropertyValue'
import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'

const CANONICAL_SETS: Partial<
  Record<VisualPropertyValueTypeName, Set<string>>
> = {
  [VisualPropertyValueTypeName.NodeShape]: new Set(
    Object.values(NodeShapeType),
  ),
  [VisualPropertyValueTypeName.EdgeLine]: new Set(Object.values(EdgeLineType)),
  [VisualPropertyValueTypeName.NodeBorderLine]: new Set(
    Object.values(NodeBorderLineType),
  ),
}

// Desktop / legacy names that do not reduce to a canonical value by case and
// separator normalization alone. Keys are already normalized (see normalizeKey).
const ALIASES: Record<string, string> = {
  dot: 'dotted',
  'equal-dash': 'dashed',
  'long-dash': 'dashed',
  'dash-dot': 'dashed',
  'rounded-rectangle': 'round-rectangle',
  'round-rect': 'round-rectangle',
  rect: 'rectangle',
}

const normalizeKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')

/**
 * Return the canonical Web value for a shape / line-type value, or the original
 * value unchanged when it is not an enum-typed property or cannot be mapped.
 */
export const normalizeEnumValue = (
  vpType: VisualPropertyValueTypeName,
  value: VisualPropertyValueType,
): VisualPropertyValueType => {
  const canonical = CANONICAL_SETS[vpType]
  if (canonical === undefined || typeof value !== 'string') {
    return value
  }
  // Already a canonical value.
  if (canonical.has(value)) {
    return value
  }
  const key = normalizeKey(value)
  if (canonical.has(key)) {
    return key
  }
  const alias = ALIASES[key]
  if (alias !== undefined && canonical.has(alias)) {
    return alias
  }
  // Unknown value: leave it as-is. The import warnings (CW-505) surface
  // unsupported line types, and the renderer falls back to a sensible default.
  return value
}
