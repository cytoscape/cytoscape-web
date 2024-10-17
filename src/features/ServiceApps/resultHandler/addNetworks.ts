import { useCallback } from 'react'
import { ActionHandlerProps } from './serviceResultHandlerManager'

export const useAddNetworks = (): (({
  responseObj,
  networkId,
}: ActionHandlerProps) => void) => {
  const addNetworks = useCallback(
    ({ responseObj, networkId }: ActionHandlerProps) => {},
    [],
  )
  return addNetworks
}
