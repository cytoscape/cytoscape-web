import { NetworkViewer } from './NetworkViewer'
import { Suspense } from 'react'

interface NetworkPanelProps {
  uuids: string[]
}

export const NetworkPanel = ({ uuids }: NetworkPanelProps): JSX.Element => {
  // const addNode = useNetworkStore((state) => state.addNode)
  // const addNodes = useNetworkStore((state) => state.addNodes)

  // const handleUpdate = (): void => {
  //   if (network !== undefined) {
  //     addNode(network.id, `testNode${Math.random()}`)
  //     console.log('handleUpdate', network.nodes.length)
  //   }
  // }

  return (
    <>
      <h1>Multiple Netowrks</h1>
      {/* <button onClick={handleUpdate}>Add Node</button> */}
      {uuids.map((uuid) => (
        <Suspense fallback={<div>Loading Network {uuid}...</div>} key={uuid}>
          <NetworkViewer key={uuid} uuid={uuid} />
        </Suspense>
      ))}
    </>
  )
}
