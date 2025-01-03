import { useCallback } from 'react'
import { ActionHandlerProps } from './serviceResultHandlerManager'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { useNetworkStore } from '../../../store/NetworkStore'
import { Cx2Network } from '../../../models/CxModel/Cx2Network'

export const useAddNetworks = (): (({
  responseObj,
  networkId,
}: ActionHandlerProps) => void) => {
  const addNetworksToWorkspace: (ids: IdType | IdType[]) => void = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )
  const addNewNetwork = useNetworkStore((state) => state.add)

  const addNetworks = useCallback(
    ({ responseObj, networkId }: ActionHandlerProps) => {
      const cx2Networks = responseObj as Cx2Network[]
      // if(){

      // }
    },
    [addNetworksToWorkspace],
  )
  return addNetworks
}
