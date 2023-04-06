import { MenuItem } from '@mui/material'
import { ReactElement, useState, useContext } from 'react'
import { IdType } from '../../../models/IdType'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { BaseMenuProps } from '../BaseMenuProps'
import { LoadFromNdexDialog } from './LoadFromNdexDialog'
import { networkSummaryFetcher } from '../../../store/useNdexNetworkSummary'
import { useCredentialStore } from '../../../store/CredentialStore'

import { AppConfigContext } from '../../../AppConfigContext'
export const LoadFromNdexMenuItem = (props: BaseMenuProps): ReactElement => {
  const addNetworks: (ids: IdType | IdType[]) => void = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )

  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  const getToken = useCredentialStore((state) => state.getToken)

  const [openDialog, setOpenDialog] = useState<boolean>(false)
  const [invalidNetworkIds, setInvalidNetworkIds] = useState<IdType[]>([])

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
    props.handleClose()
  }

  const handleOpenDialog = (): void => {
    setOpenDialog(true)
  }
  const { ndexBaseUrl, maxNetworkElementsThreshold, maxNetworkFileSize } =
    useContext(AppConfigContext)

  const handleLoad = async (uuidStr: string): Promise<void> => {
    const uuids: IdType[] = uuidStr.split(' ')
    const token = await getToken()
    const summaries = await networkSummaryFetcher(uuids, ndexBaseUrl, token)

    const invalidNetworkIds: IdType[] = []
    const validNetworkIds: IdType[] = []

    summaries.forEach((summary) => {
      if (summary !== undefined) {
        const networkSizeTooLarge = summary.cx2FileSize > maxNetworkFileSize
        const tooManyNetworkElements =
          summary.nodeCount + summary.edgeCount > maxNetworkElementsThreshold
        if (networkSizeTooLarge || tooManyNetworkElements) {
          invalidNetworkIds.push(summary.externalId)
        } else {
          validNetworkIds.push(summary.externalId)
        }
      }
    })
    console.log('Given UUID string: ', uuidStr)
    console.log('Got UUID List: ', uuids)
    console.log('Valid networks', validNetworkIds)
    addNetworks(validNetworkIds)
    let nextCurrentNetworkId: IdType | undefined
    if (Array.isArray(uuids)) {
      nextCurrentNetworkId = uuids[0]
    } else {
      nextCurrentNetworkId = uuids
    }

    if (nextCurrentNetworkId !== undefined) {
      setCurrentNetworkId(nextCurrentNetworkId)
    }

    if (invalidNetworkIds.length > 0) {
      setInvalidNetworkIds(invalidNetworkIds)
    } else {
      setOpenDialog(false)
      props.handleClose()
    }
  }

  return (
    <>
      <MenuItem onClick={handleOpenDialog}>
        Load network(s) from NDEx...
      </MenuItem>
      <LoadFromNdexDialog
        open={openDialog}
        handleClose={handleCloseDialog}
        handleLoad={handleLoad}
        invalidNetworkIds={invalidNetworkIds}
      />
    </>
  )
}
