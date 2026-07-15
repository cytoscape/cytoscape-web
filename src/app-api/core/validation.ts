// src/app-api/core/validation.ts
// Shared input-validation guards for app API core functions.
//
// Guards return an ApiFailure tagged with the CX2 validation code they
// enforce (see ApiError.cx2Code), or undefined when the input is valid:
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
import { ApiErrorCode, ApiFailure, fail } from '../types/ApiResult'

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
      ApiErrorCode.InvalidInput,
      `Attribute "id" is forbidden in the ${elementType} attributes payload`,
      elementType === 'node' ? 'N3' : 'E6',
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
    return fail(ApiErrorCode.InvalidInput, 'Column name must not be empty')
  }
  if (columnName === 'id') {
    return fail(
      ApiErrorCode.InvalidInput,
      `Column name "id" is forbidden for ${tableType}s`,
      tableType === 'node' ? 'FK1' : 'FK2',
    )
  }
  if (tableType === 'edge' && EDGE_STRUCTURAL_KEYS.has(columnName)) {
    return fail(
      ApiErrorCode.InvalidInput,
      `Column name "${columnName}" is reserved for edge source/target keys`,
      'A8',
    )
  }
  if (PROTOTYPE_POLLUTION_KEYS.has(columnName)) {
    return fail(
      ApiErrorCode.InvalidInput,
      `Column name "${columnName}" is not allowed`,
    )
  }
  return undefined
}

/**
 * Verify that every ID in elementIds exists as a node or edge in the
 * network. Returns a failure naming the missing IDs, tagged with the
 * CX2 code for the calling context (e.g. 'BV1' for bypass targets).
 */
export function validateElementsExist(
  networkId: IdType,
  elementIds: IdType[],
  cx2Code?: string,
): ApiFailure | undefined {
  const network = useNetworkStore.getState().networks.get(networkId)
  if (network === undefined) {
    return fail(
      ApiErrorCode.NetworkNotFound,
      `Network ${networkId} not found`,
    )
  }

  const known = new Set<IdType>()
  network.nodes.forEach((n) => known.add(n.id))
  network.edges.forEach((e) => known.add(e.id))

  const missing = elementIds.filter((id) => !known.has(id))
  if (missing.length > 0) {
    return fail(
      ApiErrorCode.ElementNotFound,
      `Elements do not exist in network ${networkId}: ${missing.join(', ')}`,
      cx2Code,
    )
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
    return fail(
      ApiErrorCode.NetworkNotFound,
      `Network ${networkId} not found`,
    )
  }

  const elements: Array<{ id: IdType }> =
    tableType === 'node' ? network.nodes : network.edges
  const known = new Set(elements.map((el) => el.id))
  const missing = elementIds.filter((id) => !known.has(id))
  if (missing.length > 0) {
    return fail(
      tableType === 'node'
        ? ApiErrorCode.NodeNotFound
        : ApiErrorCode.EdgeNotFound,
      `${tableType === 'node' ? 'Nodes' : 'Edges'} do not exist in network ${networkId}: ${missing.join(', ')}`,
      tableType === 'node' ? 'GL1' : 'GL2',
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
    return fail(
      ApiErrorCode.NetworkNotFound,
      `Network ${networkId} not found`,
    )
  }

  const nodeIds = new Set(network.nodes.map((n) => n.id))
  const mismatched =
    group === 'node'
      ? elementIds.filter((id) => !nodeIds.has(id))
      : elementIds.filter((id) => nodeIds.has(id))

  if (mismatched.length > 0) {
    return fail(
      ApiErrorCode.InvalidInput,
      `Visual property is ${group}-scoped but these elements are not ${group}s: ${mismatched.join(', ')}`,
      'BV2',
    )
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
    return fail(
      ApiErrorCode.InvalidInput,
      `Attribute "${attribute}" is not declared in the ${tableType} table`,
      'MI1',
    )
  }
  if (attributeType !== undefined && attributeType !== column.type) {
    return fail(
      ApiErrorCode.InvalidInput,
      `attributeType "${attributeType}" does not match the declared type ` +
        `"${column.type}" of attribute "${attribute}"`,
      'MI2',
    )
  }
  if (options?.requireNumeric === true && !NUMERIC_TYPES.has(column.type)) {
    return fail(
      ApiErrorCode.InvalidInput,
      `CONTINUOUS mapping requires a numeric attribute; "${attribute}" is ` +
        `${column.type}`,
      'MI3',
    )
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

/**
 * Validate a scalar visual property value against the property's
 * declared value type (CX2 VP1-VP6). Structured types (custom graphics,
 * label position) are not checked here — see backlog item 3.6. Opacity
 * properties additionally enforce the 0-1 range (VP3).
 */
export function validateVisualPropertyValue(
  vpName: VisualPropertyName | string,
  valueTypeName: VisualPropertyValueTypeName | undefined,
  vpValue: unknown,
): ApiFailure | undefined {
  const invalid = (cx2Code: string, reason: string): ApiFailure =>
    fail(
      ApiErrorCode.InvalidInput,
      `Invalid value for ${vpName}: ${reason} (got ${JSON.stringify(vpValue)})`,
      cx2Code,
    )

  switch (valueTypeName) {
    case VisualPropertyValueTypeName.Color:
      if (typeof vpValue !== 'string' || !HEX_COLOR.test(vpValue)) {
        return invalid('VP2', 'expected a hex color like #rrggbb')
      }
      return undefined
    case VisualPropertyValueTypeName.Number: {
      if (typeof vpValue !== 'number' || !Number.isFinite(vpValue)) {
        return invalid('VP4', 'expected a finite number')
      }
      const isOpacity = String(vpName).toLowerCase().includes('opacity')
      if (isOpacity && (vpValue < 0 || vpValue > 1)) {
        return invalid('VP3', 'opacity must be between 0 and 1')
      }
      return undefined
    }
    case VisualPropertyValueTypeName.String:
      return typeof vpValue === 'string'
        ? undefined
        : invalid('VP1', 'expected a string')
    case VisualPropertyValueTypeName.Boolean:
      return typeof vpValue === 'boolean'
        ? undefined
        : invalid('VP5', 'expected a boolean')
    case VisualPropertyValueTypeName.Font:
      return typeof vpValue === 'string' &&
        new Set(Object.values(FontType)).has(vpValue as FontType)
        ? undefined
        : invalid('VP6', 'unknown font face')
    default: {
      if (valueTypeName === undefined) return undefined
      const enumValues = ENUM_VALUES[valueTypeName]
      if (enumValues !== undefined) {
        return typeof vpValue === 'string' && enumValues.has(vpValue)
          ? undefined
          : invalid(
              'VP5',
              `expected one of: ${[...enumValues].join(', ')}`,
            )
      }
      // Structured types (customGraphic, customGraphicPosition) and any
      // unrecognized type names pass through — handled by item 3.6
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
      ApiErrorCode.InvalidInput,
      'attributeValues must not be empty for a continuous mapping',
      'V7',
    )
  }
  const isFiniteNumber = (v: unknown): boolean =>
    typeof v === 'number' && Number.isFinite(v)

  const badValues = attributeValues.filter((v) => !isFiniteNumber(v))
  if (badValues.length > 0) {
    return fail(
      ApiErrorCode.InvalidInput,
      `Continuous mapping requires numeric, finite attributeValues; got ` +
        `${JSON.stringify(badValues.slice(0, 3))}`,
      'V7',
    )
  }
  if (controlPoints !== undefined) {
    const badPoints = controlPoints.filter((cp) => !isFiniteNumber(cp.value))
    if (badPoints.length > 0) {
      return fail(
        ApiErrorCode.InvalidInput,
        'Continuous mapping control points must have numeric, finite values',
        'V7',
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
        ApiErrorCode.InvalidInput,
        `Value for column "${edit.column}" does not match declared type ` +
          `${declaredType}: ${JSON.stringify(edit.value)}`,
        'A1',
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
    return fail(
      ApiErrorCode.InvalidInput,
      `Column "${columnName}" already exists`,
      'AC6',
    )
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
    return fail(
      ApiErrorCode.InvalidInput,
      'Column default value must not be null',
      'A6',
    )
  }
  return undefined
}
