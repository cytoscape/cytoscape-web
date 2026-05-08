import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'

import { BaseMenuItemProps } from "../BaseMenuItemProps"
import { DropdownMenuItem } from "../DropdownMenu"


export const LicenseMenuItem = (
  props: BaseMenuItemProps,
): React.ReactElement => {

  return (
    <DropdownMenuItem 
      label="License"
      icon={<ArticleOutlinedIcon />}
      onClick={props.onClick}
    />
  )
}