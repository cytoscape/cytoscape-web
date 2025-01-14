import { useCallback } from 'react'
import { useVisualStyleStore } from '../store/VisualStyleStore'
import { IdType, ValueTypeName } from '../models'
import { VisualPropertyName, VisualStyle } from '../models/VisualStyleModel'

/**
 * A custom hook that returns a function to apply a Visual Style
 * to a given network in the store.
 */
export const useApplyVisualStyle = (): ((
  networkId: IdType,
  style: VisualStyle,
) => void) => {
  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const createPassthroughMapping = useVisualStyleStore(
    (state) => state.createPassthroughMapping,
  )

  const applyVisualStyle = useCallback(
    (networkId: IdType, style: VisualStyle) => {
      // Update or add the style in the VisualStyle store
      addVisualStyle(networkId, style)

      // Optionally set up a default label mapping (similar to createNetworkWithView)
      createPassthroughMapping(
        networkId,
        VisualPropertyName.NodeLabel,
        'name',
        ValueTypeName.String,
      )
    },
    [addVisualStyle, createPassthroughMapping],
  )

  return applyVisualStyle
}
