import { NetworkViewer } from './NetworkViewer'
import { Suspense, useState } from 'react'
import { LoadingMessage } from './LoadingMessage'
import { deleteDb } from '../../store/persist/db'
import { useNetworkStore } from '../../store/NetworkStore'
import { IdType } from '../../models/IdType'
import { Network } from '../../models/NetworkModel'

// Large
// const L_NET_ID = '36f7d8fd-23dc-11e8-b939-0ac135e8bacf'

// Medium
// const M_NET_ID = 'f7a218c0-2376-11ea-bb65-0ac135e8bacf'

// Small
const S_NET_ID = '7fc70ab6-9fb1-11ea-aaef-0ac135e8bacf'

/**
 * Sample panel to use netowrk models
 *  - Add / delete networks
 *
 * @param param0
 * @returns
 */
export const DemoPanel = (): JSX.Element => {
  const [newUuid, setNewUuid] = useState<string>('')
  const [networkIds, setNetworkIds] = useState<string[]>([S_NET_ID])

  const deleteNetwork = useNetworkStore((state) => state.delete)
  const networks: Record<string, Network> = useNetworkStore(
    (state) => state.networks,
  )
  // const addNetwork = useNetworkStore((state) => state.add)

  const handleDbDelete = async (): Promise<void> => {
    await deleteDb()
    // console.log('DB Deleted')
  }

  const handleDelete = async (uuid: string): Promise<void> => {
    setNetworkIds(networkIds.filter((id) => id !== uuid))
    deleteNetwork(uuid)
  }

  const handleAddNetwork = (uuid: string): void => {
    setNetworkIds([...networkIds, uuid])
  }

  const handleChange = (event: any): void => {
    setNewUuid(event.target.value)
  }

  return (
    <>
      <h1>Load / Delete Multiple Netowrks</h1>
      <p>Networks in global store: {Object.keys(networks).length}</p>
      <button type="button" onClick={handleDbDelete}>
        Delete Database
      </button>

      <hr />

      <div>
        <h6>Add New Network with NDEx UUID:</h6>
        <div style={{ display: 'flex' }}>
          <textarea value={newUuid} onChange={handleChange} />
          <button onClick={() => handleAddNetwork(newUuid)}>Add</button>
        </div>
      </div>
      {networkIds.map((uuid: IdType) => (
        <Suspense
          fallback={<LoadingMessage message={`Loading from NDEx: ${uuid}`} />}
          key={uuid}
        >
          <hr />
          <NetworkViewer key={uuid} uuid={uuid} />
          <button onClick={() => handleDelete(uuid)}>
            Delete This Network
          </button>
        </Suspense>
      ))}
    </>
  )
}
