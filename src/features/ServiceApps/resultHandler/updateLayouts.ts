import { useCallback } from 'react'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { ActionHandlerProps } from './serviceResultHandlerManager'
import { useAppStore } from '../../../store/AppStore'

interface UpdatedPosition {
  id: number
  x: number
  y: number
  z?: number
}

export const useUpdateLayouts = (): (({
  responseObj,
  networkId,
}: ActionHandlerProps) => void) => {
  const setNodePosition = useViewModelStore((state) => state.setNodePosition)
  const isValidUpdatedPosition = (obj: any): obj is UpdatedPosition => {
    return (
      obj &&
      typeof obj.id === 'number' &&
      typeof obj.x === 'number' &&
      typeof obj.y === 'number' &&
      (obj.z === undefined || typeof obj.z === 'number')
    )
  }
  const updateLayouts = useCallback(
    ({ responseObj, networkId }: ActionHandlerProps) => {
      if (!Array.isArray(responseObj)) {
        console.warn('Invalid layout update response: Expected an array', responseObj)
        return
      }

      for (const item of responseObj) {
        if (isValidUpdatedPosition(item)) {
          const { id, x, y, z } = item
          setNodePosition(networkId, String(id), [x, y, z])
        } else {
          console.warn('Invalid UpdatedPosition item:', item)
        }
      }
    },
    [setNodePosition],
  )
  return updateLayouts
}
