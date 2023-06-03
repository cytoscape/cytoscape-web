import { useEffect, useState } from 'react'
import { Allotment } from 'allotment'
import { MessagePanel } from '../../../components/Messages'
import { Box } from '@mui/material'
import { SubNetworkPanel } from './SubNetworkPanel'
import { IdType } from '../../../models/IdType'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { HcxMetaData } from '../model/HcxMetaData'
import { getHcxProps } from '../utils/hierarcy-util'
import { NdexNetworkSummary } from '../../../models/NetworkSummaryModel'

export const ViewerPanel = (): JSX.Element => {
  const [panes, setPanes] = useState([0, 1])

  // Check the network property and enable the UI only if it is a hierarchy
  const [isHierarchy, setIsHierarchy] = useState<boolean>(false)

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  // At this point, summary can be any network prop object
  const networkSummary: any = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  useEffect(() => {
    const summary: NdexNetworkSummary = networkSummary

    const metadata: HcxMetaData | undefined = getHcxProps(summary)
    console.log(
      '###currentNetworkId and summary',
      currentNetworkId,
      summary,
      isHierarchy,
      metadata,
    )

    if (metadata !== undefined) {
      setIsHierarchy(true)
    }
  }, [currentNetworkId])

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Allotment vertical minSize={100}>
        <Allotment.Pane>
          <SubNetworkPanel networkId={currentNetworkId} />
        </Allotment.Pane>
        <Allotment.Pane maxSize={1000}>
          <Allotment>
            {panes.map((pane) => (
              <Allotment.Pane key={pane}>
                <MessagePanel message={`Property Panel ${pane + 1}`} />
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, right: 0 }}>
                    <button
                      type="button"
                      onClick={() =>
                        setPanes((panes) => {
                          const newPanes = [...panes]
                          newPanes.splice(pane, 1)
                          return newPanes
                        })
                      }
                    >
                      x
                    </button>
                  </div>
                </div>
              </Allotment.Pane>
            ))}
          </Allotment>
        </Allotment.Pane>
      </Allotment>
    </Box>
  )
}
