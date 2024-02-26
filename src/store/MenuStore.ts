import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface Menu {
  id: number
  parent: string
  name: string
  weight: number
}

const defaultMenus: Menu[] = []

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
