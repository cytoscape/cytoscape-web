import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dropzone/styles.css'
import { MenuItem } from '@mui/material'
import { ReactElement } from 'react'

import { BaseMenuProps } from '../../../../components/ToolBar/BaseMenuProps'
import { useCreateNetworkFromTableStore } from '../../store/createNetworkFromTableStore'

export const CreateNetworkFromTableFileMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const setShow = useCreateNetworkFromTableStore((state) => state.setShow)

  return (
    <div>
      <MenuItem onClick={() => setShow(true)}>
        Upload network from table file
      </MenuItem>
    </div>
  )
}
