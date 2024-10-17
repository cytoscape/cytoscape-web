import { useCallback } from 'react'
import { ActionHandlerProps } from './serviceResultHandlerManager'

export const useAddTables = (): (({
  responseObj,
  networkId,
}: ActionHandlerProps) => void) => {
  const addTables = useCallback(
    ({ responseObj, networkId }: ActionHandlerProps) => {},
    [],
  )
  return addTables
}
