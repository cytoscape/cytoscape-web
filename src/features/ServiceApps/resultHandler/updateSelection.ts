import { useCallback } from 'react'
import { ActionHandlerProps } from './serviceResultHandlerManager'
import { useViewModelStore } from '../../../store/ViewModelStore'

interface UpdatedSelection {
  nodes: number[]
  edges: number[]
}

export const useUpdateSelection = (): (({
  responseObj,
  networkId,
}: ActionHandlerProps) => void) => {
  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const isValidUpdatedSelection = (obj: any): obj is UpdatedSelection =>
  obj &&
  Array.isArray(obj.nodes) &&
  obj.nodes.every((id: any) => typeof id === 'number') &&
  Array.isArray(obj.edges) &&
  obj.edges.every((id: any) => typeof id === 'number')

  const updateSelection = useCallback(
    ({ responseObj, networkId }: ActionHandlerProps) => {
      if (!isValidUpdatedSelection(responseObj)) {
        console.warn('Invalid selection update response:', responseObj)
        return
      }
      const selectedNodeIds = responseObj.nodes
      const selectedEdgeIds = responseObj.edges
      exclusiveSelect(
        networkId,
        selectedNodeIds.map((id) => String(id)),
        selectedEdgeIds.map((id) => `e${id}`),
      )
    },
    [exclusiveSelect],
  )
  return updateSelection
}
