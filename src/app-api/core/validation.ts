// src/app-api/core/validation.ts
// Shared input-validation guards for app API core functions.
//
// Guards return an ApiFailure built from the precise error code they
// enforce (ElementCodes/TableCodes/StyleCodes/AppCodes — see
// src/app-api/types/ApiResult.ts), or undefined when the input is valid:
//
//   const invalid = validateNoIdAttribute(options?.attributes, 'node')
//   if (invalid) return invalid

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { IdType } from '../../models/IdType'
import {
  AttributeName,
  ValueType,
  ValueTypeName,
} from '../../models/TableModel'
import {
  EdgeArrowShapeType,
  EdgeLineType,
  FontType,
  HorizontalAlignType,
  NodeBorderLineType,
  NodeShapeType,
  VerticalAlignType,
  VisibilityType,
  VisualPropertyName,
  VisualPropertyValueTypeName,
} from '../../models/VisualStyleModel'
import {
  CustomGraphicsNameType,
  CustomGraphicsTypeType,
} from '../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import {
  AppCodes,
  ApiFailure,
  ElementCodes,
  fail,
  StyleCodes,
  TableCodes,
} from '../types/ApiResult'

/**
 * Element attribute payloads must not contain an "id" key — the element
 * ID lives outside the attributes object, and shadowing it is forbidden
 * (CX2 N3 for nodes, E6 for edges).
 */
export function validateNoIdAttribute(
  attributes: Record<AttributeName, ValueType> | undefined,
  elementType: 'node' | 'edge',
): ApiFailure | undefined {
  if (attributes !== undefined && 'id' in attributes) {
    return fail(
      elementType === 'node'
        ? ElementCodes.NODE_ID_FORBIDDEN
        : ElementCodes.EDGE_ID_FORBIDDEN,
    )
  }
  return undefined
}

/** Edge source/target keys — reserved at the CX2 structural level (A8) */
const EDGE_STRUCTURAL_KEYS = new Set(['s', 't'])

/** Keys that would pollute Object prototypes if used as record keys */
const PROTOTYPE_POLLUTION_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
])

/**
 * Column names must be non-empty, must not shadow the element id
 * (CX2 FK1 for nodes / FK2 for edges), must not collide with the edge
 * source/target structural keys (A8), and must not be prototype-pollution
 * vectors. Node-table "reserved" names like `name` stay allowed — they
 * are warning-level in CX2 (AC3) and legitimately used throughout
 * Cytoscape Web.
 */
export function validateColumnName(
  columnName: string,
  tableType: 'node' | 'edge',
): ApiFailure | undefined {
  if (columnName.trim() === '') {
    return fail(AppCodes.INVALID_INPUT, 'Column name must not be empty')
  }
  if (columnName === 'id') {
    return fail(
      tableType === 'node'
        ? TableCodes.NODE_ID_COLUMN_FORBIDDEN
        : TableCodes.EDGE_ID_COLUMN_FORBIDDEN,
    )
  }
  if (tableType === 'edge' && EDGE_STRUCTURAL_KEYS.has(columnName)) {
    return fail(TableCodes.EDGE_STRUCTURAL_KEY_RESERVED, columnName)
  }
  if (PROTOTYPE_POLLUTION_KEYS.has(columnName)) {
    return fail(
      AppCodes.INVALID_INPUT,
      `Column name "${columnName}" is not allowed`,
    )
  }
  return undefined
}

/**
 * Verify that every ID in elementIds exists as a node or edge in the
 * network — used for bypass target existence (CX2 BV1). Returns a
 * failure naming the missing IDs.
 */
export function validateElementsExist(
  networkId: IdType,
  elementIds: IdType[],
): ApiFailure | undefined {
  const network = useNetworkStore.getState().networks.get(networkId)
  if (network === undefined) {
    return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
  }

  const known = new Set<IdType>()
  network.nodes.forEach((n) => known.add(n.id))
  network.edges.forEach((e) => known.add(e.id))

  const missing = elementIds.filter((id) => !known.has(id))
  if (missing.length > 0) {
    return fail(StyleCodes.BYPASS_TARGET_NOT_FOUND, missing.join(', '))
  }
  return undefined
}

/**
 * Verify that every ID exists as an element of the given kind: node IDs
 * for node tables (CX2 GL1), edge IDs for edge tables (GL2). Returns a
 * failure naming the missing IDs.
 */
export function validateTableElementsExist(
  networkId: IdType,
  tableType: 'node' | 'edge',
  elementIds: IdType[],
): ApiFailure | undefined {
  const network = useNetworkStore.getState().networks.get(networkId)
  if (network === undefined) {
    return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
  }

  const elements: Array<{ id: IdType }> =
    tableType === 'node' ? network.nodes : network.edges
  const known = new Set(elements.map((el) => el.id))
  const missing = elementIds.filter((id) => !known.has(id))
  if (missing.length > 0) {
    return fail(
      tableType === 'node'
        ? ElementCodes.NODE_NOT_FOUND
        : ElementCodes.EDGE_NOT_FOUND,
      missing.join(', '),
    )
  }
  return undefined
}

/**
 * Verify that every ID in nodeIds exists as a node (not an edge) in the
 * network. Returns a failure naming the missing IDs (CX2 GL1).
 */
export function validateNodesExist(
  networkId: IdType,
  nodeIds: IdType[],
): ApiFailure | undefined {
  return validateTableElementsExist(networkId, 'node', nodeIds)
}

/**
 * Verify that bypass targets match the visual property's element group:
 * node-scoped properties may only target nodes, edge-scoped only edges
 * (CX2 BV2). Call after validateElementsExist, so every ID is known to
 * exist and a non-node ID is necessarily an edge (and vice versa).
 */
export function validateBypassTargetScope(
  networkId: IdType,
  elementIds: IdType[],
  group: 'node' | 'edge',
): ApiFailure | undefined {
  const network = useNetworkStore.getState().networks.get(networkId)
  if (network === undefined) {
    return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
  }

  const nodeIds = new Set(network.nodes.map((n) => n.id))
  const mismatched =
    group === 'node'
      ? elementIds.filter((id) => !nodeIds.has(id))
      : elementIds.filter((id) => nodeIds.has(id))

  if (mismatched.length > 0) {
    return fail(StyleCodes.BYPASS_SCOPE_MISMATCH, group, mismatched.join(', '))
  }
  return undefined
}

const NUMERIC_TYPES: ReadonlySet<ValueTypeName> = new Set([
  ValueTypeName.Integer,
  ValueTypeName.Long,
  ValueTypeName.Double,
])

/**
 * Verify a visual mapping's source attribute: it must be declared as a
 * column in the table matching the visual property's group (CX2 MI1),
 * the caller-supplied attributeType must agree with the declared column
 * type (MI2), and CONTINUOUS mappings additionally require a numeric
 * source column (MI3).
 */
export function validateMappingAttribute(
  networkId: IdType,
  tableType: 'node' | 'edge',
  attribute: AttributeName,
  attributeType?: ValueTypeName,
  options?: { requireNumeric?: boolean },
): ApiFailure | undefined {
  const tableRecord = useTableStore.getState().tables[networkId]
  const table =
    tableRecord?.[tableType === 'node' ? 'nodeTable' : 'edgeTable']
  const column = table?.columns?.find(
    (c: { name: string }) => c.name === attribute,
  )
  if (column === undefined) {
    return fail(StyleCodes.MAPPING_ATTRIBUTE_UNDECLARED, attribute, tableType)
  }
  if (attributeType !== undefined && attributeType !== column.type) {
    return fail(
      StyleCodes.MAPPING_TYPE_MISMATCH,
      attributeType,
      column.type,
      attribute,
    )
  }
  if (options?.requireNumeric === true && !NUMERIC_TYPES.has(column.type)) {
    return fail(StyleCodes.MAPPING_REQUIRES_NUMERIC, attribute, column.type)
  }
  return undefined
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

/** Enum-valued visual property types and their legal values (CX2 VP5) */
const ENUM_VALUES: Partial<Record<string, ReadonlySet<string>>> = {
  [VisualPropertyValueTypeName.NodeShape]: new Set(
    Object.values(NodeShapeType),
  ),
  [VisualPropertyValueTypeName.EdgeLine]: new Set(
    Object.values(EdgeLineType),
  ),
  [VisualPropertyValueTypeName.EdgeArrowShape]: new Set(
    Object.values(EdgeArrowShapeType),
  ),
  [VisualPropertyValueTypeName.NodeBorderLine]: new Set(
    Object.values(NodeBorderLineType),
  ),
  [VisualPropertyValueTypeName.Visibility]: new Set(
    Object.values(VisibilityType),
  ),
  [VisualPropertyValueTypeName.HorizontalAlign]: new Set(
    Object.values(HorizontalAlignType),
  ),
  [VisualPropertyValueTypeName.VerticalAlign]: new Set(
    Object.values(VerticalAlignType),
  ),
}

const POSITION_VALUES = new Set(['center', 'top', 'bottom', 'left', 'right'])
const ANCHOR_VALUES = new Set(['C', 'N', 'S', 'E', 'W'])
const JUSTIFICATION_VALUES = new Set(['left', 'center', 'right'])
const CUSTOM_GRAPHICS_TYPES = new Set<string>(
  Object.values(CustomGraphicsTypeType),
)
const CUSTOM_GRAPHICS_NAMES = new Set<string>(
  Object.values(CustomGraphicsNameType),
)

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Structural check for NodeLabelPositionType — returns a reason or undefined */
function labelPositionProblem(v: unknown): string | undefined {
  if (!isRecord(v)) return 'expected a label position object'
  for (const key of [
    'HORIZONTAL_ALIGN',
    'VERTICAL_ALIGN',
    'HORIZONTAL_ANCHOR',
    'VERTICAL_ANCHOR',
    'JUSTIFICATION',
  ]) {
    const value = v[key]
    if (typeof value !== 'string' || !POSITION_VALUES.has(value)) {
      return `${key} must be one of: ${[...POSITION_VALUES].join(', ')}`
    }
  }
  for (const key of ['MARGIN_X', 'MARGIN_Y']) {
    const value = v[key]
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return `${key} must be a finite number`
    }
  }
  return undefined
}

/** Structural check for CustomGraphicsType — returns a reason or undefined */
function customGraphicsProblem(v: unknown): string | undefined {
  if (!isRecord(v)) return 'expected a custom graphics object'
  if (typeof v.type !== 'string' || !CUSTOM_GRAPHICS_TYPES.has(v.type)) {
    return `type must be one of: ${[...CUSTOM_GRAPHICS_TYPES].join(', ')}`
  }
  if (typeof v.name !== 'string' || !CUSTOM_GRAPHICS_NAMES.has(v.name)) {
    return 'unknown custom graphics name'
  }
  if (!isRecord(v.properties)) return 'properties must be an object'
  return undefined
}

/** Structural check for CustomGraphicsPositionType */
function customGraphicsPositionProblem(v: unknown): string | undefined {
  if (!isRecord(v)) return 'expected a custom graphics position object'
  if (
    typeof v.JUSTIFICATION !== 'string' ||
    !JUSTIFICATION_VALUES.has(v.JUSTIFICATION)
  ) {
    return `JUSTIFICATION must be one of: ${[...JUSTIFICATION_VALUES].join(', ')}`
  }
  for (const key of ['MARGIN_X', 'MARGIN_Y']) {
    const value = v[key]
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return `${key} must be a finite number`
    }
  }
  for (const key of ['ENTITY_ANCHOR', 'GRAPHICS_ANCHOR']) {
    const value = v[key]
    if (typeof value !== 'string' || !ANCHOR_VALUES.has(value)) {
      return `${key} must be one of: ${[...ANCHOR_VALUES].join(', ')}`
    }
  }
  return undefined
}

/**
 * Validate a visual property value against the property's declared
 * value type — scalars (CX2 VP1-VP6) and structured values: label
 * position (VP7), custom graphics (VP9), and custom graphics position
 * (VP10). Opacity properties additionally enforce the 0-1 range (VP3).
 */
export function validateVisualPropertyValue(
  vpName: VisualPropertyName | string,
  valueTypeName: VisualPropertyValueTypeName | undefined,
  vpValue: unknown,
): ApiFailure | undefined {
  switch (valueTypeName) {
    case VisualPropertyValueTypeName.Color:
      if (typeof vpValue !== 'string' || !HEX_COLOR.test(vpValue)) {
        return fail(
          StyleCodes.INVALID_COLOR,
          vpName,
          'expected a hex color like #rrggbb',
        )
      }
      return undefined
    case VisualPropertyValueTypeName.Number: {
      if (typeof vpValue !== 'number' || !Number.isFinite(vpValue)) {
        return fail(StyleCodes.INVALID_NUMBER, vpName, 'expected a finite number')
      }
      const isOpacity = String(vpName).toLowerCase().includes('opacity')
      if (isOpacity && (vpValue < 0 || vpValue > 1)) {
        return fail(
          StyleCodes.INVALID_OPACITY,
          vpName,
          'opacity must be between 0 and 1',
        )
      }
      return undefined
    }
    case VisualPropertyValueTypeName.String:
      return typeof vpValue === 'string'
        ? undefined
        : fail(StyleCodes.INVALID_LABEL, vpName, 'expected a string')
    case VisualPropertyValueTypeName.Boolean:
      return typeof vpValue === 'boolean'
        ? undefined
        : fail(StyleCodes.INVALID_ENUM_VALUE, vpName, 'expected a boolean')
    case VisualPropertyValueTypeName.Font:
      return typeof vpValue === 'string' &&
        new Set(Object.values(FontType)).has(vpValue as FontType)
        ? undefined
        : fail(StyleCodes.INVALID_FONT_FACE, vpName, 'unknown font face')
    case 'nodeLabelPosition': {
      const problem = labelPositionProblem(vpValue)
      return problem === undefined
        ? undefined
        : fail(StyleCodes.INVALID_LABEL_POSITION, vpName, problem)
    }
    case VisualPropertyValueTypeName.CustomGraphic: {
      const problem = customGraphicsProblem(vpValue)
      return problem === undefined
        ? undefined
        : fail(StyleCodes.INVALID_CUSTOM_GRAPHICS, vpName, problem)
    }
    case VisualPropertyValueTypeName.CustomGraphicPosition: {
      const problem = customGraphicsPositionProblem(vpValue)
      return problem === undefined
        ? undefined
        : fail(StyleCodes.INVALID_CUSTOM_GRAPHICS_POSITION, vpName, problem)
    }
    default: {
      if (valueTypeName === undefined) return undefined
      const enumValues = ENUM_VALUES[valueTypeName]
      if (enumValues !== undefined) {
        return typeof vpValue === 'string' && enumValues.has(vpValue)
          ? undefined
          : fail(
              StyleCodes.INVALID_ENUM_VALUE,
              vpName,
              `expected one of: ${[...enumValues].join(', ')}`,
            )
      }
      // Unrecognized type names pass through unvalidated
      return undefined
    }
  }
}

/**
 * Continuous mappings require numeric, finite values for their min/max
 * bounds and control points (CX2 V7). NaN and Infinity are rejected
 * rather than coerced to null (NI5/NI6 are warning-level; the API
 * rejects).
 */
export function validateContinuousMappingBounds(
  attributeValues: ValueType[],
  controlPoints?: Array<{ value: unknown }>,
): ApiFailure | undefined {
  if (attributeValues.length === 0) {
    return fail(
      StyleCodes.CONTINUOUS_MAPPING_NOT_NUMERIC,
      'attributeValues must not be empty for a continuous mapping',
    )
  }
  const isFiniteNumber = (v: unknown): boolean =>
    typeof v === 'number' && Number.isFinite(v)

  const badValues = attributeValues.filter((v) => !isFiniteNumber(v))
  if (badValues.length > 0) {
    return fail(
      StyleCodes.CONTINUOUS_MAPPING_NOT_NUMERIC,
      `attributeValues must be numeric and finite; got ` +
        `${JSON.stringify(badValues.slice(0, 3))}`,
    )
  }
  if (controlPoints !== undefined) {
    const badPoints = controlPoints.filter((cp) => !isFiniteNumber(cp.value))
    if (badPoints.length > 0) {
      return fail(
        StyleCodes.CONTINUOUS_MAPPING_NOT_NUMERIC,
        'control points must have numeric, finite values',
      )
    }
  }
  return undefined
}

/** Runtime check of a single (non-list) value against a CX2 scalar type */
function scalarMatchesType(value: ValueType, type: ValueTypeName): boolean {
  switch (type) {
    case ValueTypeName.String:
      return typeof value === 'string'
    case ValueTypeName.Boolean:
      return typeof value === 'boolean'
    case ValueTypeName.Double:
      return typeof value === 'number'
    case ValueTypeName.Integer:
    case ValueTypeName.Long:
      return typeof value === 'number' && Number.isInteger(value)
    default:
      return false
  }
}

const LIST_ELEMENT_TYPE: Partial<Record<ValueTypeName, ValueTypeName>> = {
  [ValueTypeName.ListString]: ValueTypeName.String,
  [ValueTypeName.ListLong]: ValueTypeName.Long,
  [ValueTypeName.ListInteger]: ValueTypeName.Integer,
  [ValueTypeName.ListDouble]: ValueTypeName.Double,
  [ValueTypeName.ListBoolean]: ValueTypeName.Boolean,
}

/** Runtime check of a value (scalar or list) against a CX2 column type */
export function valueMatchesType(
  value: ValueType,
  type: ValueTypeName,
): boolean {
  // null is a legal cell value for any column type (CX2 AI6)
  if (value === null) return true

  const elementType = LIST_ELEMENT_TYPE[type]
  if (elementType !== undefined) {
    return (
      Array.isArray(value) &&
      value.every((el) => scalarMatchesType(el, elementType))
    )
  }
  return scalarMatchesType(value, type)
}

/**
 * Verify that each edit's value matches the declared type of its target
 * column (CX2 A1). Values are checked strictly — no coercion (CX2 NP9
 * treats coercion as warning-level; the API rejects instead). Edits to
 * undeclared columns pass through — declaration policy is a separate
 * concern (see backlog item 3.2).
 */
export function validateValuesMatchColumnTypes(
  columns: Array<{ name: string; type: ValueTypeName }>,
  edits: Array<{ column: AttributeName; value: ValueType }>,
): ApiFailure | undefined {
  const typeByName = new Map(columns.map((c) => [c.name, c.type]))
  for (const edit of edits) {
    const declaredType = typeByName.get(edit.column)
    if (declaredType === undefined) continue
    if (!valueMatchesType(edit.value, declaredType)) {
      return fail(
        TableCodes.VALUE_TYPE_MISMATCH,
        edit.column,
        declaredType,
        JSON.stringify(edit.value),
      )
    }
  }
  return undefined
}

/**
 * A new or renamed column must not collide with an already-declared
 * column in the same table (CX2 AC6 / AI1).
 */
export function validateColumnNameAvailable(
  columns: Array<{ name: string }>,
  columnName: string,
): ApiFailure | undefined {
  if (columns.some((c) => c.name === columnName)) {
    return fail(TableCodes.COLUMN_ALREADY_EXISTS, columnName)
  }
  return undefined
}

/**
 * Column default values must not be null or undefined (CX2 A6). Falsy
 * values like 0, false, and '' are valid defaults.
 */
export function validateColumnDefaultValue(
  defaultValue: ValueType | null | undefined,
): ApiFailure | undefined {
  if (defaultValue === null || defaultValue === undefined) {
    return fail(TableCodes.COLUMN_DEFAULT_NULL)
  }
  return undefined
}
