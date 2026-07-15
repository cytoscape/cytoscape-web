// src/app-api/core/validation.ts
// Shared input-validation guards for app API core functions.
//
// Guards return an ApiFailure tagged with the CX2 validation code they
// enforce (see ApiError.cx2Code), or undefined when the input is valid:
//
//   const invalid = validateNoIdAttribute(options?.attributes, 'node')
//   if (invalid) return invalid

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { IdType } from '../../models/IdType'
import { AttributeName, ValueType } from '../../models/TableModel'
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
