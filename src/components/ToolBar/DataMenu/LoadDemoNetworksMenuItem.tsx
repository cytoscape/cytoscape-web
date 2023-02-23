import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'
import { IdType } from '../../../models/IdType'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { BaseMenuProps } from '../BaseMenuProps'

// Sample networks in dev server
const SAMPLE_NETWORK_IDS: string[] = [
  '4ae2709d-3055-11ec-94bf-525400c25d22',
  '8b3faf53-3056-11ec-94bf-525400c25d22',
  '8b51d7c5-3056-11ec-94bf-525400c25d22',
  '8b957078-3056-11ec-94bf-525400c25d22',
  '8baf882a-3056-11ec-94bf-525400c25d22',
  '8bd2797c-3056-11ec-94bf-525400c25d22',
  'f625f9ef-3055-11ec-94bf-525400c25d22',
  'f950ad02-3055-11ec-94bf-525400c25d22',
  'f96b39e4-3055-11ec-94bf-525400c25d22',
  'f99975d6-3055-11ec-94bf-525400c25d22',
  'f9aeab88-3055-11ec-94bf-525400c25d22',
  'f9ca49da-3055-11ec-94bf-525400c25d22',
  '8bd2797c-3056-11ec-94bf-525400c25d22',
  'ab0eeef6-25bd-11e9-a05d-525400c25d22',
]

export const LoadDemoNetworksMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const addNetworks: (ids: IdType | IdType[]) => void = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )

  const handleRemoveAllNetworks = (): void => {
    console.info('(Not implemented) All networks removed')
    props.handleClose()
    addNetworks(SAMPLE_NETWORK_IDS)
  }

  return (
    <MenuItem onClick={handleRemoveAllNetworks}>
      (Demo) Load sample networks
    </MenuItem>
  )
}
