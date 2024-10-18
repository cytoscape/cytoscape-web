import { useCallback } from 'react'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { ActionHandlerProps } from './serviceResultHandlerManager'
import { useAppStore } from '../../../store/AppStore'

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
  const setNodePosition = useViewModelStore((state) => state.setNodePosition)
  const updateLayouts = useCallback(
    ({ responseObj, networkId }: ActionHandlerProps) => {
      if (!Array.isArray(responseObj)) return
      for (const item of responseObj) {
        const updatedPosition = item as Partial<UpdatedPosition>
        if (
          updatedPosition &&
          typeof updatedPosition.id === 'string' &&
          typeof updatedPosition.x === 'number' &&
          typeof updatedPosition.y === 'number'
        ) {
          const { id, x, y, z } = updatedPosition
          setNodePosition(networkId, id, [x, y, z])
        }
      }
    },
    [],
  )
  return updateLayouts
}
