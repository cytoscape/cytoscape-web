import { useCallback } from 'react'
import { ActionHandlerProps } from './serviceResultHandlerManager'

export const useUpdateNetworks = (): (({
  responseObj,
  networkId,
}: ActionHandlerProps) => void) => {
  const updateNetworks = useCallback(
    ({ responseObj, networkId }: ActionHandlerProps) => {},
    [],
  )
  return updateNetworks
}
