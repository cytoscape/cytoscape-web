import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { MenuItem } from '../models/MenuModel'

const defaultMenus: MenuItem[] = []

interface MenuState {
  menues: Menu[]
}

interface MenuAction {
  addMenu: (menu: Menu) => void
  deleteMenu: (id: number) => void
}

type MenuStore = MenuState & MenuAction

export const useMenuStore = create(
  immer<MenuStore>((set) => ({
    menues: [],
    addMenu: (menu: Menu) => {
      set((state) => {
        state.menues.push(menu)
      })
    },
    deleteMenu: (id: number) => {
      set((state) => {
        state.menues = state.menues.filter((m) => m.id !== id)
      })
    },
  })),
)
