// src/app-api/types/ApiResult.ts

/**
 * Error codes for app API operations.
 *
 * Each code maps to a specific category of failure. App API hooks
 * choose the most specific code applicable. External apps can
 * switch on `error.code` for programmatic error handling.
 */
export const ApiErrorCode = {
  /** The specified network does not exist in the store */
  NetworkNotFound: 'NETWORK_NOT_FOUND',

  /** The specified node does not exist in the network */
  NodeNotFound: 'NODE_NOT_FOUND',

  /** The specified edge does not exist in the network */
  EdgeNotFound: 'EDGE_NOT_FOUND',

  /** Input validation failed (missing/malformed parameters) */
  InvalidInput: 'INVALID_INPUT',

  /** CX2 data failed structural validation */
  InvalidCx2: 'INVALID_CX2',

  /** A store operation threw an unexpected error */
  OperationFailed: 'OPERATION_FAILED',

  /** The requested layout engine is not registered */
  LayoutEngineNotFound: 'LAYOUT_ENGINE_NOT_FOUND',

  /** A renderer function (e.g., fit) is not registered */
  FunctionNotAvailable: 'FUNCTION_NOT_AVAILABLE',

  /** No network is currently selected in the workspace */
  NoCurrentNetwork: 'NO_CURRENT_NETWORK',
} as const

/**
 * Union type of all error code string values.
 * Use `typeof ApiErrorCode[keyof typeof ApiErrorCode]` for the type.
 */
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode]

/**
 * Detailed error information returned by failed app API operations.
 */
export interface ApiError {
  /** Machine-readable error code for programmatic handling */
  readonly code: ApiErrorCode

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
 * Construct a failed ApiResult from an error code and message.
 *
 * @example
 * ```typescript
 * return fail(ApiErrorCode.NetworkNotFound, `Network ${id} not found`)
 * ```
 */
export function fail(code: ApiErrorCode, message: string): ApiFailure {
  return {
    success: false,
    error: { code, message },
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
