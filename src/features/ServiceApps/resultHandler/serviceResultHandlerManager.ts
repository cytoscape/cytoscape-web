import { ServiceAppAction } from '../../../models/AppModel/ServiceAppAction'
import { JsonNode } from '../model'
import { useAddNetworks } from './addNetworks'
import { useAddTables } from './addTables'
import { useUpdateLayouts } from './updateLayouts'
import { useUpdateNetwork } from './updateNetwork'
import { useUpdateSelection } from './updateSelection'
import { useUpdateTables } from './updateTables'
import { useOpenURL } from './openURL'

export interface ActionHandlerProps {
  responseObj: JsonNode
  networkId: string
}

export const useServiceResultHandlerManager = () => {
  const addNetworks = useAddNetworks()
  const addTables = useAddTables()
  const updateLayouts = useUpdateLayouts()
  const updateNetwork = useUpdateNetwork()
  const updateSelection = useUpdateSelection()
  const updateTables = useUpdateTables()
  const openURL = useOpenURL()
  const getHandler = (action: ServiceAppAction) => {
    switch (action) {
      case ServiceAppAction.AddNetworks:
        return addNetworks
      case ServiceAppAction.AddTables:
        return addTables
      case ServiceAppAction.UpdateLayouts:
        return updateLayouts
      case ServiceAppAction.UpdateNetwork:
        return updateNetwork
      case ServiceAppAction.UpdateSelection:
        return updateSelection
      case ServiceAppAction.UpdateTables:
        return updateTables
      case ServiceAppAction.OpenURL:
        return openURL
      default:
        return undefined
    }
  }
  return { getHandler }
}
