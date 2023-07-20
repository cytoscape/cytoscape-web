import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../models/IdType'
import { Ui } from '../models/UiModel'
import { PanelState } from '../models/UiModel/PanelState'
import { Panel } from '../models/UiModel/Panel'

interface UiState {
  ui: Ui
}

interface UiStateAction {
  setActiveNetworkView: (id: IdType) => void
  setPanelState: (panel: Panel, state: PanelState) => void
  enablePopup: (enable: boolean) => void
}

type UiStateStore = UiState & UiStateAction

export const useUiStateStore = create(
  immer<UiStateStore>((set) => ({
    ui: {
      panels: {
        [Panel.LEFT]: PanelState.OPEN,
        [Panel.RIGHT]: PanelState.CLOSED,
      },
      activeNetworkView: '',
      enablePopup: false,
    },
    setActiveNetworkView: (id: IdType) => {
      set((state) => {
        state.ui.activeNetworkView = id
      })
    },
    setPanelState: (panel: Panel, panelState: PanelState) => {
      set((state) => {
        state.ui.panels[panel] = panelState
      })
    },
    enablePopup: (enable: boolean) => {
      set((state) => {
        state.ui.enablePopup = enable
      })
    },
  })),
)
