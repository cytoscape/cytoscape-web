import { Suspense, ReactElement } from 'react'
import { Network } from '../../models/NetworkModel'
import { useNetwork } from '../../store/useNetwork'
import { LoadingMessage } from './LoadingMessage'

const NET_ID = '7fc70ab6-9fb1-11ea-aaef-0ac135e8bacf'
const NET_URL = `https://public.ndexbio.org/v3/networks/${NET_ID}`

export const NetworkViewer = (): ReactElement => {
  const response: { loading: boolean; error?: any; data?: Network } =
    useNetwork(NET_ID, NET_URL)

  const id = response.data !== undefined ? response.data.id : 'N/A'

  return (
    <Suspense
      fallback={<LoadingMessage message={'Loading network from NDEx'} />}
    >
      <h1>Test Network Viewer</h1>

      <div>Network Loaded: {id}</div>
    </Suspense>
  )
}
