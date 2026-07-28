import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import { FC, useState } from 'react'

import { useWorkspaceStore } from '../../../../data/hooks/stores/WorkspaceStore'
import { BaseMenuItemProps } from '../../BaseMenuItemProps'
import { DropdownMenuItem } from '../../DropdownMenu'
import { ExportImage } from './ExportImage'

// The dialog now lives in its own module so other entry points (e.g. the
// summary panel's network overflow menu) can open it too.
export {
  ExportImage,
  type ExportFormRef,
  type ExportImageFormatProps,
} from './ExportImage'

export const ExportImageMenuItem: FC<BaseMenuItemProps> = () => {
  const [show, setShow] = useState(false)

  const networkIds = useWorkspaceStore((state) => state.workspace.networkIds)
  const menuItem = (
    <DropdownMenuItem
      label="Network to Image..."
      icon={<ImageOutlinedIcon />}
      disabled={networkIds.length === 0}
      onClick={() => setShow(true)}
    />
  )

  return (
    <>
      {menuItem}
      <ExportImage open={show} handleClose={() => setShow(false)} />
    </>
  )
}
