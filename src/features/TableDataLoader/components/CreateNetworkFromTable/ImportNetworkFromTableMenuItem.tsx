import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'

import { BaseMenuItemProps } from '../../../ToolBar/BaseMenuItemProps'
import { useCreateNetworkFromTableStore } from '../../store/createNetworkFromTableStore'

export const CreateNetworkFromTableFileMenuItem = (
  props: BaseMenuItemProps,
): ReactElement => {
  const setShow = useCreateNetworkFromTableStore((state) => state.setShow)

  return (
    <div>
      <MenuItem
        onClick={() => {
          setShow(true)
          props.onClick()
        }}
      >
        Network from File
      </MenuItem>
    </div>
  )
}
