import { ReactElement, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { IdType } from '../models/IdType'
import NetworkRenderer from './NetworkRenderer'

const NetworkPanel = (): ReactElement => {
  const { networkId } = useParams()
  const currentNetworkId: IdType = networkId ?? ''
  return (
    <Suspense fallback={<h1>Loading Network...</h1>} key={currentNetworkId}>
      <NetworkRenderer currentNetworkId={currentNetworkId} />
    </Suspense>
  )
}

export default NetworkPanel
