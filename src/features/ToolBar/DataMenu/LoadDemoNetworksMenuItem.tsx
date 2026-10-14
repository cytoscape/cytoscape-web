import { ReactElement } from 'react'

import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useLoadDemoNetworks } from '../../../data/hooks/useLoadDemoNetworks'
import { MessageSeverity } from '../../../models/MessageModel'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

export const LoadDemoNetworksMenuItem = (
  props: BaseMenuItemProps,
): ReactElement => {
  const { loadDemoNetworks } = useLoadDemoNetworks()
  const addMessage = useMessageStore((state) => state.addMessage)

  const handleClick = (): void => {
    // Close the menu right away; the NDEx round trip continues in the
    // background. A menu item has nowhere to render a failure, so it goes
    // to the snackbar (the empty-workspace panel renders its own inline).
    props.onClick()
    void loadDemoNetworks().then((ok) => {
      if (!ok) {
        addMessage({
          duration: 10000,
          message:
            'Could not open the sample networks. NDEx may be unreachable — check your connection and try again.',
          severity: MessageSeverity.ERROR,
        })
      }
    })
  }

  return <DropdownMenuItem label="Open Sample Networks" onClick={handleClick} />
}
