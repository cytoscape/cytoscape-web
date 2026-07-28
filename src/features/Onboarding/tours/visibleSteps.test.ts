import { describe, expect, it } from 'vitest'

import { gettingStartedTour } from './gettingStarted'
import { TourStepDef } from './types'
import { visibleSteps } from './visibleSteps'

const step = (over: Partial<TourStepDef> = {}): TourStepDef => ({
  target: 'toolbar',
  title: 'title',
  content: 'content',
  ...over,
})

describe('visibleSteps', () => {
  it('keeps every step when a network is on screen', () => {
    const steps = [step(), step({ requiresNetwork: true })]
    expect(visibleSteps(steps, true)).toEqual(steps)
  })

  it('drops requiresNetwork steps when no network is on screen', () => {
    const plain = step({ target: 'toolbar' })
    const networkOnly = step({ target: 'fit-button', requiresNetwork: true })

    expect(visibleSteps([plain, networkOnly], false)).toEqual([plain])
  })

  it('treats an absent requiresNetwork flag as network-independent', () => {
    const steps = [step({ requiresNetwork: undefined })]
    expect(visibleSteps(steps, false)).toEqual(steps)
  })

  it('preserves order', () => {
    const a = step({ target: 'toolbar' })
    const b = step({ target: 'fit-button', requiresNetwork: true })
    const c = step({ target: 'table-browser' })

    expect(visibleSteps([a, b, c], false)).toEqual([a, c])
  })

  // Regression guard for the real trap. Joyride skips a step only when its
  // target is missing from the DOM, and these two targets are mounted whether
  // or not a network is loaded — the canvas pane is an unconditional
  // Allotment.Pane in WorkspaceEditor, and `table-browser` sits on
  // TableBrowser's root Box. Before the explicit network check, a first-run
  // user with an empty workspace was told their network was drawn on the
  // canvas and that the table held the data behind the graph.
  describe('the getting-started tour on an empty workspace', () => {
    const shown = visibleSteps(gettingStartedTour.steps, false)
    const targets = shown.map((s) => s.target)

    it.each(['workspace-editor-center-pane', 'table-browser'])(
      'does not present the always-mounted network-only target %s',
      (target) => {
        expect(targets).not.toContain(target)
      },
    )

    it('presents no requiresNetwork step at all', () => {
      expect(shown.filter((s) => s.requiresNetwork === true)).toEqual([])
    })

    it('still presents the network-independent steps', () => {
      expect(targets).toContain('toolbar')
      expect(targets).toContain('toolbar-help-menu-menu-button')
      expect(shown.length).toBeGreaterThan(2)
    })
  })
})
