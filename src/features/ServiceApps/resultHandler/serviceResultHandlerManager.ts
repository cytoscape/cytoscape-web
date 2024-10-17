import { ServiceAppAction } from '../../../models/AppModel/ServiceAppAction'
import { JsonNode } from '../model'
import { useAddNetworks } from './addNetworks'
import { useAddTables } from './addTables'
import { useUpdateLayouts } from './updateLayouts'
import { useUpdateNetworks } from './updateNetworks'
import { useUpdateSelections } from './updateSelections'
import { useUpdateTables } from './updateTables'

export interface ActionHandlerProps {
  responseObj: any
  networkId: string
}

export const useServiceResultHandlerManager = () => {
  const addNetworks = useAddNetworks()
  const addTables = useAddTables()
  const updateLayouts = useUpdateLayouts()
  const updateNetworks = useUpdateNetworks()
  const updateSelections = useUpdateSelections()
  const updateTables = useUpdateTables()
  const getHandler = (action: ServiceAppAction) => {
    switch (action) {
      case ServiceAppAction.AddNetworks:
        return addNetworks
      case ServiceAppAction.AddTables:
        return addTables
      case ServiceAppAction.UpdateLayouts:
        return updateLayouts
      case ServiceAppAction.UpdateNetworks:
        return updateNetworks
      case ServiceAppAction.UpdateSelections:
        return updateSelections
      case ServiceAppAction.UpdateTables:
        return updateTables
      default:
        return undefined
    }
  }
  return { getHandler }
}
