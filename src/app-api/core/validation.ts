// src/app-api/core/validation.ts
// Shared input-validation guards for app API core functions.
//
// Guards return an ApiFailure tagged with the CX2 validation code they
// enforce (see ApiError.cx2Code), or undefined when the input is valid:
//
//   const invalid = validateNoIdAttribute(options?.attributes, 'node')
//   if (invalid) return invalid

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
