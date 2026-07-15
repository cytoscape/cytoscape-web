// src/app-api/core/visualStyleApi.ts
// Framework-agnostic Visual Style API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { IdType } from '../../models/IdType'
import { AttributeName, ValueType, ValueTypeName } from '../../models/TableModel'
import {
  ContinuousFunctionControlPoint,
  ContinuousMappingFunction,
  MappingFunctionType,
  VisualPropertyName,
  VisualPropertyValueType,
  VisualPropertyValueTypeName,
} from '../../models/VisualStyleModel'
import { ApiErrorCode, ApiFailure, ApiResult, fail, ok } from '../types/ApiResult'
import {
  validateBypassTargetScope,
  validateContinuousMappingBounds,
  validateElementsExist,
  validateMappingAttribute,
} from './validation'

// ── Public types ─────────────────────────────────────────────────────────────

export interface VisualStyleApi {
  setDefault(
    networkId: IdType,
    vpName: VisualPropertyName,
    vpValue: VisualPropertyValueType,
  ): ApiResult

  setBypass(
    networkId: IdType,
    vpName: VisualPropertyName,
    elementIds: IdType[],
    vpValue: VisualPropertyValueType,
  ): ApiResult

  deleteBypass(
    networkId: IdType,
    vpName: VisualPropertyName,
    elementIds: IdType[],
  ): ApiResult

  createDiscreteMapping(
    networkId: IdType,
    vpName: VisualPropertyName,
    attribute: AttributeName,
    attributeType: ValueTypeName,
    mapping?: Record<string, VisualPropertyValueType>,
  ): ApiResult

  createContinuousMapping(
    networkId: IdType,
    vpName: VisualPropertyName,
    vpType: VisualPropertyValueTypeName,
    attribute: AttributeName,
    attributeValues: ValueType[],
    attributeType: ValueTypeName,
    controlPoints?: ContinuousFunctionControlPoint[],
    ltMinVpValue?: VisualPropertyValueType,
    gtMaxVpValue?: VisualPropertyValueType,
  ): ApiResult

  createPassthroughMapping(
    networkId: IdType,
    vpName: VisualPropertyName,
    attribute: AttributeName,
    attributeType: ValueTypeName,
  ): ApiResult

  removeMapping(networkId: IdType, vpName: VisualPropertyName): ApiResult
}

// ── Private helpers ──────────────────────────────────────────────────────────

/**
 * Shared preconditions for the three mapping creators: the visual
 * property must exist, must not be network-scoped (CX2 MC1), and its
 * source attribute must be declared with a compatible type (MI1/MI2,
 * plus MI3 for continuous mappings).
 */
function checkMappingPreconditions(
  networkId: IdType,
  vpName: VisualPropertyName,
  attribute: AttributeName,
  attributeType: ValueTypeName,
  requireNumeric: boolean,
): ApiFailure | undefined {
  const visualProperty =
    useVisualStyleStore.getState().visualStyles[networkId]?.[vpName]
  if (visualProperty === undefined) {
    return fail(
      ApiErrorCode.InvalidInput,
      `Unknown visual property ${vpName}`,
    )
  }
  if (visualProperty.group === 'network') {
    return fail(
      ApiErrorCode.InvalidInput,
      `Network-scoped visual property ${vpName} cannot have a mapping`,
      'MC1',
    )
  }
  return validateMappingAttribute(
    networkId,
    visualProperty.group,
    attribute,
    attributeType,
    { requireNumeric },
  )
}

// ── Core implementation ──────────────────────────────────────────────────────

export const visualStyleApi: VisualStyleApi = {
  setDefault(networkId, vpName, vpValue): ApiResult {
    try {
      const visualStyles = useVisualStyleStore.getState().visualStyles
      if (visualStyles[networkId] === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }
      useVisualStyleStore.getState().setDefault(networkId, vpName, vpValue)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  setBypass(networkId, vpName, elementIds, vpValue): ApiResult {
    try {
      const visualStyles = useVisualStyleStore.getState().visualStyles
      if (visualStyles[networkId] === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }
      if (elementIds.length === 0) {
        return fail(
          ApiErrorCode.InvalidInput,
          'elementIds must not be empty',
        )
      }

      const visualProperty = visualStyles[networkId][vpName]
      if (visualProperty === undefined) {
        return fail(
          ApiErrorCode.InvalidInput,
          `Unknown visual property ${vpName}`,
        )
      }
      if (visualProperty.group === 'network') {
        return fail(
          ApiErrorCode.InvalidInput,
          `Network-scoped visual property ${vpName} cannot be bypassed`,
          'BV5',
        )
      }

      const missingElements = validateElementsExist(
        networkId,
        elementIds,
        'BV1',
      )
      if (missingElements) return missingElements

      const scopeMismatch = validateBypassTargetScope(
        networkId,
        elementIds,
        visualProperty.group,
      )
      if (scopeMismatch) return scopeMismatch

      useVisualStyleStore
        .getState()
        .setBypass(networkId, vpName, elementIds, vpValue)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  deleteBypass(networkId, vpName, elementIds): ApiResult {
    try {
      const visualStyles = useVisualStyleStore.getState().visualStyles
      if (visualStyles[networkId] === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }
      useVisualStyleStore
        .getState()
        .deleteBypass(networkId, vpName, elementIds)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  createDiscreteMapping(networkId, vpName, attribute, attributeType, mapping): ApiResult {
    try {
      const store = useVisualStyleStore.getState()
      const visualStyles = store.visualStyles
      if (visualStyles[networkId] === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }
      const invalid = checkMappingPreconditions(
        networkId,
        vpName,
        attribute,
        attributeType,
        false,
      )
      if (invalid) return invalid

      // Build a complete discrete mapping with entries in one call
      const vpValueMap = new Map<ValueType, VisualPropertyValueType>()
      if (mapping) {
        for (const [key, value] of Object.entries(mapping)) {
          const parsedKey =
            attributeType === ValueTypeName.Integer ||
            attributeType === ValueTypeName.Long
              ? parseInt(key, 10)
              : attributeType === ValueTypeName.Double
                ? parseFloat(key)
                : key
          vpValueMap.set(parsedKey, value)
        }
      }
      const visualProperty = visualStyles[networkId][vpName]
      store.setMapping(networkId, vpName, {
        attribute,
        type: MappingFunctionType.Discrete,
        vpValueMap,
        visualPropertyType: visualProperty.type,
        defaultValue: visualProperty.defaultValue,
      })
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  createContinuousMapping(
    networkId,
    vpName,
    vpType,
    attribute,
    attributeValues,
    attributeType,
    controlPoints,
    ltMinVpValue,
    gtMaxVpValue,
  ): ApiResult {
    try {
      const store = useVisualStyleStore.getState()
      if (store.visualStyles[networkId] === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }
      const invalid = checkMappingPreconditions(
        networkId,
        vpName,
        attribute,
        attributeType,
        true,
      )
      if (invalid) return invalid

      const invalidBounds = validateContinuousMappingBounds(
        attributeValues,
        controlPoints,
      )
      if (invalidBounds) return invalidBounds

      store.createContinuousMapping(
        networkId,
        vpName,
        vpType,
        attribute,
        attributeValues,
        attributeType,
      )

      // createContinuousMapping computes default min/max/controlPoints/lt/gt values;
      // read them back so any caller-supplied overrides can fall back to those defaults.
      const currentMapping = useVisualStyleStore.getState().visualStyles[networkId][
        vpName
      ].mapping as ContinuousMappingFunction | undefined
      if (currentMapping) {
        const effectiveControlPoints = controlPoints ?? currentMapping.controlPoints
        const min: ContinuousFunctionControlPoint = controlPoints
          ? controlPoints[0]
          : currentMapping.min
        const max: ContinuousFunctionControlPoint = controlPoints
          ? controlPoints[controlPoints.length - 1]
          : currentMapping.max
        useVisualStyleStore.getState().setContinuousMappingValues(
          networkId,
          vpName,
          min,
          max,
          effectiveControlPoints,
          ltMinVpValue ?? currentMapping.ltMinVpValue,
          gtMaxVpValue ?? currentMapping.gtMaxVpValue,
        )
      }
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  createPassthroughMapping(networkId, vpName, attribute, attributeType): ApiResult {
    try {
      const visualStyles = useVisualStyleStore.getState().visualStyles
      if (visualStyles[networkId] === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }
      const invalid = checkMappingPreconditions(
        networkId,
        vpName,
        attribute,
        attributeType,
        false,
      )
      if (invalid) return invalid

      useVisualStyleStore
        .getState()
        .createPassthroughMapping(networkId, vpName, attribute, attributeType)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  removeMapping(networkId, vpName): ApiResult {
    try {
      const visualStyles = useVisualStyleStore.getState().visualStyles
      if (visualStyles[networkId] === undefined) {
        return fail(
          ApiErrorCode.NetworkNotFound,
          `Network ${networkId} not found`,
        )
      }
      useVisualStyleStore.getState().removeMapping(networkId, vpName)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },
}
