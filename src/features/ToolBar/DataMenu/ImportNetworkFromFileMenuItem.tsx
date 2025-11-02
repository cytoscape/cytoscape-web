import { Button, MenuItem } from '@mui/material'
import { ReactElement, useRef, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

import { FileUpload } from '../FileUpload'

export const UploadNetworkMenuItem = (props: BaseMenuProps): ReactElement => {
  const [show, setShow] = useState(false)

  const menuItem = (
    <MenuItem component="label" onClick={() => setShow(true)}>
      Network from File...
    </MenuItem>
  )

  return (
    <>
      {menuItem}
      <FileUpload
        show={show}
        handleClose={() => {
          props.handleClose()
          setShow(false)
        }}
      />
    </>
  )
}
