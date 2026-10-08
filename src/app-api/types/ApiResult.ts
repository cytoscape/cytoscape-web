// src/app-api/types/ApiResult.ts

// ── Structured error code catalog ───────────────────────────────────────────
//
// Mirrors the `DiagnosticCode` pattern used by the CX2 library
// (research/cytoscape-beyond/cx2/src/codes.ts — a separate, unrelated
// repo; not a dependency, purely a design precedent). Each code carries
// its own severity and message template, so `fail()` takes a single
// code-definition object plus template arguments instead of a coarse
// category string, a hand-written message, and an optional secondary tag.
//
// Codes borrowed from the CX2 validation requirements reuse the CX2 code
// string verbatim as `code` (e.g. 'FK1', 'BV1') — external apps already
// familiar with the CX2 spec recognize them directly, and there is no
// need for a secondary "which CX2 rule is this" field. Concepts with no
// CX2 equivalent (workspace/registry/runtime state) get new codes in a
// distinct `APP*` namespace that can never collide with a future CX2
// code addition, since CX2 (a static document format) has no session
// state to begin with.

/** Severity of an app API error code, mirroring the CX2 diagnostic model. */
export type ApiErrorSeverity = 'error' | 'warning'

/**
 * Static definition of one app API error code. `message` may be a
 * template function when the failure needs to embed caller-supplied
 * values (mirrors CX2's `DiagnosticCode`).
 */
export interface ApiErrorCodeDef {
  readonly code: string
  readonly severity: ApiErrorSeverity
  readonly message: string | ((...args: any[]) => string)
}

/**
 * Node/edge existence and structural id-shadowing rules.
 * @see src/app-api/api_docs/ErrorCodes.md
 */
export const ElementCodes = {
  /** @see src/app-api/api_docs/ErrorCodes.md#n3 */
  NODE_ID_FORBIDDEN: {
    code: 'N3',
    severity: 'error',
    message: 'Attribute "id" is forbidden in the node attributes payload',
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#e6 */
  EDGE_ID_FORBIDDEN: {
    code: 'E6',
    severity: 'error',
    message: 'Attribute "id" is forbidden in the edge attributes payload',
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#gl1 */
  NODE_NOT_FOUND: {
    code: 'GL1',
    severity: 'error',
    message: (id: string) => `Node ${id} does not exist`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#gl2 */
  EDGE_NOT_FOUND: {
    code: 'GL2',
    severity: 'error',
    message: (id: string) => `Edge ${id} does not exist`,
  },
} as const satisfies Record<string, ApiErrorCodeDef>

/**
 * Table column/attribute rules.
 * @see src/app-api/api_docs/ErrorCodes.md
 */
export const TableCodes = {
  /** @see src/app-api/api_docs/ErrorCodes.md#fk1 */
  NODE_ID_COLUMN_FORBIDDEN: {
    code: 'FK1',
    severity: 'error',
    message: 'Column name "id" is forbidden for nodes',
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#fk2 */
  EDGE_ID_COLUMN_FORBIDDEN: {
    code: 'FK2',
    severity: 'error',
    message: 'Column name "id" is forbidden for edges',
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#a8 */
  EDGE_STRUCTURAL_KEY_RESERVED: {
    code: 'A8',
    severity: 'error',
    message: (name: string) =>
      `Column name "${name}" is reserved for edge source/target keys`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#a6 */
  COLUMN_DEFAULT_NULL: {
    code: 'A6',
    severity: 'error',
    message: 'Column default value must not be null',
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#a1 */
  VALUE_TYPE_MISMATCH: {
    code: 'A1',
    severity: 'error',
    message: (column: string, declaredType: string, value: string) =>
      `Value for column "${column}" does not match declared type ` +
      `${declaredType}: ${value}`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#ac6 */
  COLUMN_ALREADY_EXISTS: {
    code: 'AC6',
    severity: 'error',
    message: (name: string) => `Column "${name}" already exists`,
  },
} as const satisfies Record<string, ApiErrorCodeDef>

/**
 * Visual style, mapping, and bypass rules.
 * @see src/app-api/api_docs/ErrorCodes.md
 */
export const StyleCodes = {
  /** @see src/app-api/api_docs/ErrorCodes.md#bv1 */
  BYPASS_TARGET_NOT_FOUND: {
    code: 'BV1',
    severity: 'error',
    message: (ids: string) => `Elements do not exist for bypass: ${ids}`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#bv2 */
  BYPASS_SCOPE_MISMATCH: {
    code: 'BV2',
    severity: 'error',
    message: (group: string, ids: string) =>
      `Visual property is ${group}-scoped but these elements are not ` +
      `${group}s: ${ids}`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#bv5 */
  NETWORK_SCOPED_BYPASS_FORBIDDEN: {
    code: 'BV5',
    severity: 'error',
    message: (prop: string) =>
      `Cannot bypass network-scoped property "${prop}"`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#mc1 */
  NETWORK_SCOPED_MAPPING_FORBIDDEN: {
    code: 'MC1',
    severity: 'error',
    message: (prop: string) =>
      `Network-scoped visual property "${prop}" cannot have a mapping`,
  },
  /**
   * @see src/app-api/api_docs/ErrorCodes.md#mi1
   * @remarks CX2 treats this as advisory (warning); app API blocks the
   * mapping outright since `ApiResult` has no non-blocking channel today.
   */
  MAPPING_ATTRIBUTE_UNDECLARED: {
    code: 'MI1',
    severity: 'warning',
    message: (attr: string, tableType: string) =>
      `Attribute "${attr}" is not declared in the ${tableType} table`,
  },
  /**
   * @see src/app-api/api_docs/ErrorCodes.md#mi2
   * @remarks CX2 treats this as advisory (warning); app API blocks the
   * mapping outright since `ApiResult` has no non-blocking channel today.
   */
  MAPPING_TYPE_MISMATCH: {
    code: 'MI2',
    severity: 'warning',
    message: (given: string, declared: string, attr: string) =>
      `attributeType "${given}" does not match the declared type ` +
      `"${declared}" of attribute "${attr}"`,
  },
  /**
   * @see src/app-api/api_docs/ErrorCodes.md#mi3
   * @remarks CX2 treats this as advisory (warning); app API blocks the
   * mapping outright since `ApiResult` has no non-blocking channel today.
   */
  MAPPING_REQUIRES_NUMERIC: {
    code: 'MI3',
    severity: 'warning',
    message: (attr: string, type: string) =>
      `CONTINUOUS mapping requires a numeric attribute; "${attr}" is ` +
      `${type}`,
  },
  /**
   * @see src/app-api/api_docs/ErrorCodes.md#v7
   * @remarks Covers empty `attributeValues`, non-numeric/non-finite
   * `attributeValues`, and non-numeric/non-finite control points —
   * the caller supplies which condition failed as `reason`.
   */
  CONTINUOUS_MAPPING_NOT_NUMERIC: {
    code: 'V7',
    severity: 'error',
    message: (reason: string) =>
      `Continuous mapping requires numeric, finite bounds: ${reason}`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#vp1 */
  INVALID_LABEL: {
    code: 'VP1',
    severity: 'error',
    message: (prop: string, reason: string) =>
      `Invalid label for ${prop}: ${reason}`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#vp2 */
  INVALID_COLOR: {
    code: 'VP2',
    severity: 'error',
    message: (prop: string, reason: string) =>
      `Invalid color for ${prop}: ${reason}`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#vp3 */
  INVALID_OPACITY: {
    code: 'VP3',
    severity: 'error',
    message: (prop: string, reason: string) =>
      `Invalid opacity for ${prop}: ${reason}`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#vp4 */
  INVALID_NUMBER: {
    code: 'VP4',
    severity: 'error',
    message: (prop: string, reason: string) =>
      `Invalid numeric value for ${prop}: ${reason}`,
  },
  /**
   * @see src/app-api/api_docs/ErrorCodes.md#vp5
   * @remarks Also used for boolean-type mismatches — CX2 has no
   * dedicated boolean code, and a boolean is effectively a two-value
   * enum.
   */
  INVALID_ENUM_VALUE: {
    code: 'VP5',
    severity: 'error',
    message: (prop: string, reason: string) =>
      `Invalid value for ${prop}: ${reason}`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#vp6 */
  INVALID_FONT_FACE: {
    code: 'VP6',
    severity: 'error',
    message: (prop: string, reason: string) =>
      `Invalid font face for ${prop}: ${reason}`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#vp7 */
  INVALID_LABEL_POSITION: {
    code: 'VP7',
    severity: 'error',
    message: (prop: string, reason: string) =>
      `Invalid label position for ${prop}: ${reason}`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#vp9 */
  INVALID_CUSTOM_GRAPHICS: {
    code: 'VP9',
    severity: 'error',
    message: (prop: string, reason: string) =>
      `Invalid custom graphics for ${prop}: ${reason}`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#vp10 */
  INVALID_CUSTOM_GRAPHICS_POSITION: {
    code: 'VP10',
    severity: 'error',
    message: (prop: string, reason: string) =>
      `Invalid custom graphics position for ${prop}: ${reason}`,
  },
} as const satisfies Record<string, ApiErrorCodeDef>

/**
 * Concepts with no CX2 equivalent: workspace/registry/runtime state, and
 * a residual generic bucket for malformed input that doesn't correspond
 * to a specific CX2 rule.
 * @see src/app-api/api_docs/ErrorCodes.md
 */
export const AppCodes = {
  /** @see src/app-api/api_docs/ErrorCodes.md#app1 */
  NETWORK_NOT_FOUND: {
    code: 'APP1',
    severity: 'error',
    message: (networkId: string) => `Network ${networkId} not found`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#app2 */
  NO_CURRENT_NETWORK: {
    code: 'APP2',
    severity: 'error',
    message: 'No network is currently selected in the workspace',
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#app3 */
  OPERATION_FAILED: {
    code: 'APP3',
    severity: 'error',
    message: (detail: string) => `Operation failed: ${detail}`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#app4 */
  LAYOUT_ENGINE_NOT_FOUND: {
    code: 'APP4',
    severity: 'error',
    message: (name: string) => `Layout engine "${name}" is not registered`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#app5 */
  FUNCTION_NOT_AVAILABLE: {
    code: 'APP5',
    severity: 'error',
    message: (name: string) => `Renderer function "${name}" is not available`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#app6 */
  CONTEXT_MENU_ITEM_NOT_FOUND: {
    code: 'APP6',
    severity: 'error',
    message: (id: string) => `Context menu item "${id}" not found`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#app7 */
  RESOURCE_NOT_FOUND: {
    code: 'APP7',
    severity: 'error',
    message: (id: string) => `Resource "${id}" not found`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#app8 */
  INVALID_CX2: {
    code: 'APP8',
    severity: 'error',
    message: (detail: string) => detail,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#app9 */
  INVALID_INPUT: {
    code: 'APP9',
    severity: 'error',
    message: (detail: string) => `Invalid input: ${detail}`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#app10 */
  COLUMN_NOT_FOUND: {
    code: 'APP10',
    severity: 'error',
    message: (name: string, tableType: string) =>
      `Column "${name}" does not exist in the ${tableType} table`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#app11 */
  APP_DATA_NOT_FOUND: {
    code: 'APP11',
    severity: 'error',
    message: (key: string) => `No app data stored under key "${key}"`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#app12 */
  APP_DATA_NOT_SERIALIZABLE: {
    code: 'APP12',
    severity: 'error',
    message: (key: string, detail: string) =>
      `Value for app data key "${key}" is not JSON-serializable: ${detail}`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#app13 */
  APP_DATA_TOO_LARGE: {
    code: 'APP13',
    severity: 'error',
    message: (key: string, size: number, limit: number) =>
      `Value for app data key "${key}" is ${size} bytes, over the ` +
      `${limit}-byte per-entry limit`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#app14 */
  STYLE_SET_FULL: {
    code: 'APP14',
    severity: 'error',
    message: (networkId: string, limit: number) =>
      `Network ${networkId} already owns the maximum of ${limit} visual styles`,
  },
  /** @see src/app-api/api_docs/ErrorCodes.md#app15 */
  STYLE_NOT_FOUND: {
    code: 'APP15',
    severity: 'error',
    message: (styleId: string, networkId: string) =>
      `Network ${networkId} owns no visual style "${styleId}"`,
  },
} as const satisfies Record<string, ApiErrorCodeDef>

/**
 * Detailed error information returned by failed app API operations.
 */
export interface ApiError {
  /** Machine-readable error code for programmatic handling */
  readonly code: string

  /** Severity of this failure. See `ElementCodes`/`TableCodes`/`StyleCodes`/`AppCodes`. */
  readonly severity: ApiErrorSeverity

  /** Human-readable error description for logging and debugging */
  readonly message: string
}

/**
 * Successful result branch of the discriminated union.
 * `T` defaults to `void` for operations that return no data.
 */
export interface ApiSuccess<T = void> {
  readonly success: true
  readonly data: T
}

/**
 * Failed result branch of the discriminated union.
 */
export interface ApiFailure {
  readonly success: false
  readonly error: ApiError
}

/**
 * Discriminated union returned by all app API operations.
 *
 * External apps check `result.success` to narrow the type:
 *
 * ```typescript
 * const result = api.createNode(networkId, [100, 200])
 * if (result.success) {
 *   console.log(result.data.nodeId) // TypeScript narrows to ApiSuccess
 * } else {
 *   console.error(result.error.code) // TypeScript narrows to ApiFailure
 * }
 * ```
 *
 * App API hooks **never** throw exceptions across the API boundary.
 * All errors are captured as `ApiFailure` values.
 */
export type ApiResult<T = void> = ApiSuccess<T> | ApiFailure

/**
 * Construct a successful ApiResult with optional data.
 *
 * @example
 * ```typescript
 * // Operation with no return data
 * return ok()
 *
 * // Operation with return data
 * return ok({ nodeId: '42' })
 * ```
 */
export function ok(): ApiSuccess<void>
export function ok<T>(data: T): ApiSuccess<T>
export function ok<T>(data?: T): ApiSuccess<T> | ApiSuccess<void> {
  if (arguments.length === 0) {
    return { success: true, data: undefined as void }
  }
  return { success: true, data: data as T }
}

/**
 * Construct a failed ApiResult from a code definition and its message
 * template arguments (mirrors CX2's `createDiagnostic(code, ...args)`).
 *
 * @example
 * ```typescript
 * return fail(AppCodes.NETWORK_NOT_FOUND, networkId)
 * return fail(TableCodes.NODE_ID_COLUMN_FORBIDDEN)
 * ```
 */
export function fail(codeDef: ApiErrorCodeDef, ...args: any[]): ApiFailure {
  const message =
    typeof codeDef.message === 'function'
      ? codeDef.message(...args)
      : codeDef.message
  return {
    success: false,
    error: { code: codeDef.code, severity: codeDef.severity, message },
  }
}

/**
 * Type guard for narrowing ApiResult to ApiSuccess.
 * Useful when the discriminated union narrowing is inconvenient
 * (e.g., in filter/map chains).
 */
export function isOk<T>(result: ApiResult<T>): result is ApiSuccess<T> {
  return result.success
}

/**
 * Type guard for narrowing ApiResult to ApiFailure.
 */
export function isFail<T>(result: ApiResult<T>): result is ApiFailure {
  return !result.success
}
