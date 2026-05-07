import { BaseMenuItemProps } from "../BaseMenuItemProps"
import { DropdownMenuItem } from "../DropdownMenu"

export const LicenseMenuItem = (
  props: BaseMenuItemProps,
): React.ReactElement => {

  return (
    <DropdownMenuItem 
      label="License"
      onClick={props.onClick}
    />
  )
}