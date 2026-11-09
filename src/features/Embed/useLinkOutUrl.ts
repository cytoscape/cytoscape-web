import { useContext } from 'react'

import { AppConfigContext } from '@/AppConfigContext'
import { useUiStateStore } from '@/data/hooks/stores/UiStateStore'
import { useViewModelStore } from '@/data/hooks/stores/ViewModelStore'
import { getSubNetworkId } from '@/features/HierarchyViewer/utils/subnetworkQueryUtil'
import { IdType } from '@/models/IdType'
import { embedLinkOutUrl } from './embedLinkOut'

const NONE: IdType[] = []

/**
 * The "Open in Cytoscape Web" URL for what the embed shows now: the selection
 * of a plain network, or the subsystem, its interaction network selection and
 * the tab of a hierarchy.
 */
export const useLinkOutUrl = (
  networkId: IdType,
  isHierarchy: boolean,
  accessKey: string | undefined,
): string => {
  const { urlBaseName } = useContext(AppConfigContext)
  const selectedNodes: IdType[] = useViewModelStore(
    (state) => state.getViewModel(networkId)?.selectedNodes ?? NONE,
  )
  const selectedEdges: IdType[] = useViewModelStore(
    (state) => state.getViewModel(networkId)?.selectedEdges ?? NONE,
  )
  const subsystemId: IdType | undefined = isHierarchy
    ? selectedNodes[0]
    : undefined
  const subnetworkNodeIds: IdType[] = useViewModelStore((state) =>
    subsystemId === undefined
      ? NONE
      : (state.getViewModel(getSubNetworkId(networkId, subsystemId))
          ?.selectedNodes ?? NONE),
  )
  const networkViewTab: number = useUiStateStore(
    (state) => state.ui.networkViewUi.activeTabIndex,
  )

  return embedLinkOutUrl(window.location.origin, urlBaseName, networkId, {
    ...(isHierarchy
      ? { subsystemId, subnetworkNodeIds, networkViewTab }
      : { selectedNodes, selectedEdges }),
    accessKey,
  })
}
