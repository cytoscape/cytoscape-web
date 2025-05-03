import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  ReactNode,
} from 'react'
import ContextMenu from './ContextMenu'
import { ContextMenuItem } from './ContextMenuItem'

interface ContextMenuState {
  open: boolean
  mouseX: number
  mouseY: number
  items: ContextMenuItem[]
}

interface ContextMenuContextProps {
  showContextMenu: (event: any, items: ContextMenuItem[]) => void
  hideContextMenu: () => void
}

export const ContextMenuContext = createContext<
  ContextMenuContextProps | undefined
>(undefined)

interface ContextMenuProviderProps {
  children: ReactNode
}

export const ContextMenuProvider = ({ children }: ContextMenuProviderProps) => {
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>({
    open: false,
    mouseX: 0,
    mouseY: 0,
    items: [],
  })

  const showContextMenu = useCallback(
    (event: any, items: ContextMenuItem[]) => {
      setContextMenuState({
        open: true,
        mouseX: (event.clientX ?? 0) - 2, // Small offset for better positioning
        mouseY: (event.clientY ?? 0) - 4, // Small offset for better positioning
        items: items,
      })
    },
    [],
  )

  const hideContextMenu = useCallback(() => {
    setContextMenuState((prevState) => ({ ...prevState, open: false }))
  }, [])

  return (
    <ContextMenuContext.Provider value={{ showContextMenu, hideContextMenu }}>
      {children}
      <ContextMenu
        open={contextMenuState.open}
        mouseX={contextMenuState.mouseX}
        mouseY={contextMenuState.mouseY}
        items={contextMenuState.items}
        onClose={hideContextMenu}
      />
    </ContextMenuContext.Provider>
  )
}

export const useContextMenu = (): ContextMenuContextProps => {
  const context = useContext(ContextMenuContext)
  if (context === undefined) {
    throw new Error('useContextMenu must be used within a ContextMenuProvider')
  }
  return context
}
