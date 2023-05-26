import { useState } from 'react'
import { Allotment } from 'allotment'
import { MessagePanel } from '../../../components/Messages'

export const ViewerPanel = (): JSX.Element => {
  const [panes, setPanes] = useState([0, 1])

  return (
    <Allotment vertical minSize={100}>
      <Allotment.Pane>
        <MessagePanel
          message={'Click a subsystem to show associated interactions'}
        />
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
  )
}
