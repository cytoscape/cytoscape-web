import { createContext, useContext } from 'react'

/**
 * Where a page's LiveDemo renders. In the `split` layout ManualPage provides
 * the pinned right-hand column as `target`; LiveDemo portals into it and
 * leaves a short pointer in the text. Without a target the demo renders in
 * the text flow.
 */
export interface DemoSlot {
  readonly target: HTMLElement | null
  /** Called by a LiveDemo while mounted, so the page knows to open the column. */
  readonly register: () => () => void
}

export const DemoSlotContext = createContext<DemoSlot>({
  target: null,
  register: () => () => undefined,
})

export const useDemoSlot = (): DemoSlot => useContext(DemoSlotContext)
