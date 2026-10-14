// src/features/ToolBar/AppMenu/MenuItemIcon.tsx
//
// Renders the icon of an 'apps-menu' entry. Apps supply an image URI — the
// same contract as a 'search-bar' provider icon — never a component. The
// host renders it through UriIcon: an SVG is painted in the row's text color
// (so it follows the theme and the disabled state), a raster image is shown
// unchanged. Size and placement stay host-controlled either way.

import type { ReactElement } from 'react'

import { UriIcon } from '@/components/UriIcon'

export const MenuItemIcon = ({
  icon,
}: {
  /** http(s) URL, data:image URI, or root-relative host asset path. */
  icon?: string
}): ReactElement | null => {
  if (icon === undefined) return null

  // Centered in the row's 24px icon slot.
  return (
    <UriIcon
      src={icon}
      size={20}
      sx={{ m: '2px' }}
      data-testid="apps-menu-item-icon"
    />
  )
}
