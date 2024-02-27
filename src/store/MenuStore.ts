import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { MenuItem } from '../models/MenuModel'

interface MenuState {
  menues: Record<string, MenuItem>
}

interface MenuAction {
  addMenu: (menu: MenuItem) => void
  deleteMenu: (id: number) => void
}

type MenuStore = MenuState & MenuAction

export const useMenuStore = create(
  immer<MenuStore>((set) => ({
    menues: {},
    addMenu: (menu: MenuItem) => {
      set((state) => {
        state.menues[menu.id] = menu
      })
    },
    deleteMenu: (id: number) => {
      set((state) => {
        delete state.menues[id]
      })
    },
  })),
)
