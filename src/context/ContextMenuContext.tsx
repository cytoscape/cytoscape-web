import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  ReactNode,
} from 'react'
import ContextMenu from '../components/Util/ContextMenu/ContextMenu' // Adjust path if necessary
import { ContextMenuItem } from '../components/Util/ContextMenu/ContextMenuItem' // Adjust path if necessary

interface ContextMenuState {
  mouseX: number
  mouseY: number
  items: ContextMenuItem[]
}

interface ContextMenuContextProps {
  showContextMenu: (event: React.MouseEvent, items: ContextMenuItem[]) => void
  hideContextMenu: () => void
}

const ContextMenuContext = createContext<ContextMenuContextProps | undefined>(
  undefined,
)

interface ContextMenuProviderProps {
  children: ReactNode
}

export const ContextMenuProvider = ({ children }: ContextMenuProviderProps) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const showContextMenu = useCallback(
    (event: React.MouseEvent, items: ContextMenuItem[]) => {
      event.preventDefault()
      setContextMenu(
        contextMenu === null
          ? {
              mouseX: event.clientX - 2,
              mouseY: event.clientY - 4,
              items: items,
            }
          : null,
      )
    },
    [contextMenu],
  )

  const hideContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  return (
    <ContextMenuContext.Provider value={{ showContextMenu, hideContextMenu }}>
      {children}
      {contextMenu !== null && (
        <ContextMenu
          open={contextMenu !== null} // Pass boolean based on contextMenu state
          mouseX={contextMenu.mouseX}
          mouseY={contextMenu.mouseY}
          items={contextMenu.items}
          onClose={hideContextMenu}
        />
      )}
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
