import { Box } from '@mui/material'
import { lazy, ReactElement, Suspense, useEffect, useRef } from 'react'

import { useRendererStore } from '../../data/hooks/stores/RendererStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { IdType } from '../../models/IdType'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import { CP_RENDERER_ID } from '../HierarchyViewer/components/CirclePackingLayout/CirclePackingRenderer'
import { PropertyPanel } from '../HierarchyViewer/components/PropertyPanel/PropertyPanel'
import { useHierarchyViewerManager } from '../HierarchyViewer/store/useHierarchyViewerManager'
import { isHCX } from '../HierarchyViewer/utils/hierarchyUtil'
import { MessagePanel, SnackbarMessageList } from '../Messages'
import { CELL_VIEW_TAB_INDEX, EmbedParams } from './embedParams'
import { EmbedToolbar } from './EmbedToolbar'
import { useLinkOutUrl } from './useLinkOutUrl'

const NetworkPanel = lazy(() => import('../NetworkPanel/NetworkPanel'))
// Lazy, as in the editor's side panel: the hierarchy viewer pulls in d3 and
// react-query.
const SubNetworkViewer = lazy(() =>
  import('../HierarchyViewer/components/MainPanel').then((m) => ({
    default: m.MainPanel,
  })),
)

interface EmbedViewerProps {
  networkId: IdType
  summary: NetworkSummary
  params: EmbedParams
}

/**
 * The network on screen: the editor's NetworkPanel and, for a hierarchy, its
 * Sub Network Viewer, under the embed toolbar. Replaces WorkspaceEditor, which
 * also mounts the workspace panel, the table browser and the panel strips.
 *
 * Read-only comes from EmbedRoute's ReadOnlyContext and from what is left out.
 */
export const EmbedViewer = ({
  networkId,
  summary,
  params,
}: EmbedViewerProps): ReactElement => {
  // Registers the Cell View for a hierarchy and names the tabs, as in the
  // editor.
  useHierarchyViewerManager()

  const isHierarchy: boolean = isHCX(summary)
  const linkOutUrl = useLinkOutUrl(networkId, isHierarchy, params.accessKey)

  // A hierarchy opens on the Cell View unless the link names a tab. The tab
  // exists once the Cell View renderer is registered, after the tables load.
  const hasCellView: boolean = useRendererStore(
    (state) => state.renderers[CP_RENDERER_ID] !== undefined,
  )
  const setNetworkViewTabIndex = useUiStateStore(
    (state) => state.setNetworkViewTabIndex,
  )
  const tabAppliedRef = useRef(false)
  useEffect(() => {
    if (!isHierarchy || !hasCellView || tabAppliedRef.current) {
      return
    }
    tabAppliedRef.current = true
    setNetworkViewTabIndex(params.networkViewTab ?? CELL_VIEW_TAB_INDEX)
  }, [isHierarchy, hasCellView, params.networkViewTab, setNetworkViewTabIndex])

  // A plain network has no side panel: the attributes of a single selected
  // node float over the view instead.
  const selectedNodeCount: number = useViewModelStore(
    (state) => state.getViewModel(networkId)?.selectedNodes.length ?? 0,
  )

  return (
    <Box
      data-testid="embed-viewer"
      sx={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <EmbedToolbar networkName={summary.name} linkOutUrl={linkOutUrl} />
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          display: 'flex',
          // Side by side, or stacked in a narrow frame
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Box
          data-testid="embed-center-pane"
          sx={{
            position: 'relative',
            flex: '3 1 0',
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <Suspense fallback={<MessagePanel message="Loading network..." />}>
            <NetworkPanel networkId={networkId} />
          </Suspense>
          {!isHierarchy && selectedNodeCount === 1 && (
            <Box
              data-testid="embed-node-attributes"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 'min(18rem, 60%)',
                maxHeight: 'calc(100% - 16px)',
                overflow: 'auto',
                zIndex: 2,
                boxShadow: 2,
                borderRadius: 1,
                backgroundColor: (theme) => theme.palette.background.paper,
              }}
            >
              <PropertyPanel networkId={networkId} />
            </Box>
          )}
        </Box>
        {isHierarchy && (
          <Box
            data-testid="embed-side-pane"
            sx={{
              flex: '2 1 0',
              minWidth: 0,
              minHeight: 0,
              borderLeft: {
                sm: (theme) => `4px solid ${theme.palette.divider}`,
              },
              borderTop: {
                xs: (theme) => `4px solid ${theme.palette.divider}`,
                sm: 'none',
              },
              backgroundColor: (theme) => theme.palette.background.paper,
            }}
          >
            <Suspense fallback={null}>
              <SubNetworkViewer />
            </Suspense>
          </Box>
        )}
      </Box>
      <SnackbarMessageList />
    </Box>
  )
}
