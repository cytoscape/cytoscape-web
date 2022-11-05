import { ReactElement, useEffect } from 'react'
import { Network } from '../../models/NetworkModel'
import { useNdexNetwork, networkFetcher } from '../../store/useNetwork'

const BASE_URL = 'https://public.ndexbio.org/v3/networks'

interface NetworkViewerProps {
  uuid: string
}

/**
 *
 * @param param0
 * @returns
 */
export const NetworkViewer = ({ uuid }: NetworkViewerProps): ReactElement => {
  const network: Network = useNdexNetwork(
    uuid,
    `${BASE_URL}/${uuid}`,
    networkFetcher,
  )

  useEffect(() => {
    console.log('Viewer Initialised:', uuid)
  }, [])

  useEffect(() => {
    console.log('Network Data Updated', network?.nodes.length)
  }, [network])

  const { id, nodes, edges } = network
  return (
    <>
      <div>Current Network: {id}</div>
      <p>Num nodes = {nodes.length}</p>
      <p>Num edges = {edges.length}</p>
      <p>{network.nodes.map((node) => node.id).join(',')}</p>
    </>
  )
}
