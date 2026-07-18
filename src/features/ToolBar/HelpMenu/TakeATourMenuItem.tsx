import ExploreIcon from '@mui/icons-material/Explore'
import { ReactElement } from 'react'

import { DEFAULT_TOUR_ID, useOnboardingStore } from '../../Onboarding'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

/**
 * Help-menu item that relaunches the guided onboarding tour on demand.
 */
export const TakeATourMenuItem = (props: BaseMenuItemProps): ReactElement => {
  const startTour = useOnboardingStore((state) => state.startTour)

  const handleClick = (): void => {
    startTour(DEFAULT_TOUR_ID)
    props.onClick()
  }

  return (
    <DropdownMenuItem
      label="Take a tour"
      icon={<ExploreIcon />}
      onClick={handleClick}
    />
  )
}
