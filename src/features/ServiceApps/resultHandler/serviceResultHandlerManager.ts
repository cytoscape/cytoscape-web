import { useCallback } from 'react'

import { ServiceAppAction } from '../../../models/AppModel/ServiceAppAction'
import { JsonNode } from '../model'
import { useAddNetworks } from './addNetworks'
import { useAddTables } from './addTables'
import { useOpenURL } from './openURL'
import { useUpdateLayouts } from './updateLayouts'
import { useUpdateNetwork } from './updateNetwork'
import { useUpdateSelection } from './updateSelection'
import { useUpdateTables } from './updateTables'

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
  // Memoized so consumers (useServiceTaskRunner's `run`, and transitively
  // the AppMenu effects) keep a stable identity across renders.
  const getHandler = useCallback(
    (action: ServiceAppAction) => {
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
    },
    [
      addNetworks,
      addTables,
      updateLayouts,
      updateNetwork,
      updateSelection,
      updateTables,
      openURL,
    ],
  )
  return { getHandler }
}
