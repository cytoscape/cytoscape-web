import { useState } from 'react'
import { Allotment } from 'allotment'
import { MessagePanel } from '../../../components/Messages'
import { Box } from '@mui/material'
import { SubNetworkPanel } from './SubNetworkPanel'
import { IdType } from '../../../models/IdType'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'

export const ViewerPanel = (): JSX.Element => {
  const [panes, setPanes] = useState([0, 1])

  const networkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  return (
    <Box sx={{ width: '100%', height: '100%', background: 'pink' }}>
      <Allotment vertical minSize={100}>
        <Allotment.Pane>
          <SubNetworkPanel networkId={networkId} />
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
