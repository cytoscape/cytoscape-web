// src/app-api/core/visualStyleApi.ts
// Framework-agnostic Visual Style API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { IdType } from '../../models/IdType'
import { AttributeName, ValueType, ValueTypeName } from '../../models/TableModel'
import {
  VisualPropertyName,
  VisualPropertyValueType,
  VisualPropertyValueTypeName,
} from '../../models/VisualStyleModel'
import { ApiErrorCode, ApiResult, fail, ok } from '../types/ApiResult'

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
  ): ApiResult

  createPassthroughMapping(
    networkId: IdType,
    vpName: VisualPropertyName,
    attribute: AttributeName,
    attributeType: ValueTypeName,
  ): ApiResult

  removeMapping(networkId: IdType, vpName: VisualPropertyName): ApiResult
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
      // 1. Create the discrete mapping structure
      store.createDiscreteMapping(networkId, vpName, attribute, attributeType)

      // 2. If value→VP mapping entries are provided, populate the vpValueMap
      if (mapping && Object.keys(mapping).length > 0) {
        const vs = useVisualStyleStore.getState().visualStyles[networkId]
        const vpEntry = vs[vpName as keyof typeof vs] as any
        const existingMf = vpEntry?.mapping
        if (existingMf) {
          const vpValueMap = new Map<ValueType, VisualPropertyValueType>(
            existingMf.vpValueMap ?? [],
          )
          for (const [key, value] of Object.entries(mapping)) {
            // Parse key to match the attribute type
            const parsedKey =
              attributeType === ValueTypeName.Integer ||
              attributeType === ValueTypeName.Long
                ? parseInt(key, 10)
                : attributeType === ValueTypeName.Double
                  ? parseFloat(key)
                  : key
            vpValueMap.set(parsedKey, value)
          }
          store.setMapping(networkId, vpName, {
            ...existingMf,
            vpValueMap,
          })
        }
      }
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
  ): ApiResult {
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
        .createContinuousMapping(
          networkId,
          vpName,
          vpType,
          attribute,
          attributeValues,
          attributeType,
        )
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
