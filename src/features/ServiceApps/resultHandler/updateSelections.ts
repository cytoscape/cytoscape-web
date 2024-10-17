import { useCallback } from 'react'
import { ActionHandlerProps } from './serviceResultHandlerManager'

export const useUpdateSelections = (): (({
  responseObj,
  networkId,
}: ActionHandlerProps) => void) => {
  const updateSelections = useCallback(
    ({ responseObj, networkId }: ActionHandlerProps) => {},
    [],
  )
  return updateSelections
}
