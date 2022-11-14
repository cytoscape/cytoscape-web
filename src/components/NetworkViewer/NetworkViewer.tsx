import { ReactElement, useEffect } from 'react'
import { Network } from '../../models/NetworkModel'
import { useNdexNetwork } from '../../store/useNdexNetwork'

interface NetworkViewerProps {
  uuid: string
}

/**
 *
 * @param param0
 * @returns
 */
export const NetworkViewer = ({ uuid }: NetworkViewerProps): ReactElement => {
  const network: Network = useNdexNetwork(uuid)

  useEffect(() => {
    console.log('Viewer Initialised:', network?.id)
    return () => {
      console.log('Viewer Unmounted:', network?.id)
    }
  }, [])

  useEffect(() => {
    console.log('Network Data Updated', network?.nodes.length)
  }, [network])

  if (network === undefined) {
    return <div />
  }

  const { id, nodes, edges } = network
  return (
    <>
      <div>Viewer: {id}</div>
      <p>Num nodes = {nodes.length}</p>
      <p>Num edges = {edges.length}</p>
    </>
  )
}
