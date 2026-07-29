// src/features/ToolBar/AppMenu/MenuItemIcon.tsx
//
// Renders a MenuIcon descriptor for an 'apps-menu' entry. Apps supply plain
// SVG path data — never a component — so size/color/hover stay entirely
// host-controlled via the fixed-size <SvgIcon> wrapper below.

import SvgIcon from '@mui/material/SvgIcon'
import type { ReactElement } from 'react'

import type { MenuIcon } from '../../../models/AppModel/RegisteredAppResource'

export const MenuItemIcon = ({
  icon,
}: {
  icon?: MenuIcon
}): ReactElement | null => {
  if (!icon) return null

  return (
    <SvgIcon fontSize="small" viewBox={icon.viewBox ?? '0 0 24 24'}>
      <path d={icon.svgPath} />
    </SvgIcon>
  )
}
