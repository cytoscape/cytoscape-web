import { useCallback } from 'react'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { ActionHandlerProps } from './serviceResultHandlerManager'

interface UpdatedPosition {
  id: string
  x: number
  y: number
  z?: number
}

export const useUpdateLayouts = (): (({
  responseObj,
  networkId,
}: ActionHandlerProps) => void) => {
  // get AppStore
  const setNodePosition = useViewModelStore((state) => state.setNodePosition)
  const updateLayouts = useCallback(
    ({ responseObj, networkId }: ActionHandlerProps) => {
      for (const updatedPosition of responseObj) {
        const { id, x, y, z } = updatedPosition as UpdatedPosition
        setNodePosition(networkId, id, [x, y, z])
      }
    },
    [],
  )
  // set the status as finished
  return updateLayouts
}
