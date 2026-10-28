import { act, render, screen } from '@testing-library/react'
import { Allotment } from 'allotment'
import { ReactElement, StrictMode, Suspense } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { useRemountKeyOnReveal } from './useRemountKeyOnReveal'

// allotment initializes use-resize-observer at mount; jsdom has no
// ResizeObserver, so provide an inert stub (sizes come from the fallback
// getBoundingClientRect path instead).
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    ;(globalThis as any).ResizeObserver = ResizeObserverStub
  }
})

/**
 * Suspends while `suspended` is true and the gate has not been released.
 * Releasing resolves the thrown promise AND lets React's retry render
 * through, so the boundary reveals without another prop change.
 */
let releaseGate: (() => void) | undefined
let gate: Promise<void> | undefined
let released = false

const Gate = ({ suspended }: { suspended: boolean }): null => {
  if (suspended && !released) {
    if (gate === undefined) {
      gate = new Promise<void>((resolve) => {
        releaseGate = () => {
          released = true
          resolve()
        }
      })
    }
    throw gate
  }
  return null
}

afterEach(() => {
  gate = undefined
  releaseGate = undefined
  released = false
})

/**
 * Mirrors the WorkspaceEditor layout shape: an Allotment whose last pane is
 * conditionally mounted (the right side panel).
 */
const PlainPanes = ({ showRight }: { showRight: boolean }): ReactElement => (
  <Allotment>
    <Allotment.Pane>
      <div data-testid="left-pane" />
    </Allotment.Pane>
    {showRight && (
      <Allotment.Pane>
        <div data-testid="right-pane" />
      </Allotment.Pane>
    )}
  </Allotment>
)

const KeyedPanes = ({ showRight }: { showRight: boolean }): ReactElement => {
  const remountKey = useRemountKeyOnReveal()
  return (
    <Allotment key={remountKey}>
      <Allotment.Pane>
        <div data-testid="left-pane" />
      </Allotment.Pane>
      {showRight && (
        <Allotment.Pane>
          <div data-testid="right-pane" />
        </Allotment.Pane>
      )}
    </Allotment>
  )
}

interface HarnessProps {
  Panes: (props: { showRight: boolean }) => ReactElement
  showRight: boolean
  suspended: boolean
}

const Harness = ({
  Panes,
  showRight,
  suspended,
}: HarnessProps): ReactElement => (
  <Suspense fallback={<div data-testid="fallback" />}>
    <Gate suspended={suspended} />
    <Panes showRight={showRight} />
  </Suspense>
)

/** Hide the mounted content behind the boundary, then reveal it again. */
const suspendAndReveal = async (
  rerender: (ui: ReactElement) => void,
  Panes: HarnessProps['Panes'],
  showRight: boolean,
): Promise<void> => {
  rerender(<Harness Panes={Panes} showRight={showRight} suspended={true} />)
  expect(screen.getByTestId('fallback')).toBeDefined()
  await act(async () => {
    releaseGate?.()
    await gate
  })
  rerender(<Harness Panes={Panes} showRight={showRight} suspended={false} />)
  expect(screen.queryByTestId('fallback')).toBeNull()
}

describe('allotment across a Suspense hide/reveal cycle', () => {
  // Records the upstream allotment bug this hook was written for: React 18
  // destroys and re-attaches the subtree's effects around a Suspense
  // hide/reveal, which recreated allotment's internal split view empty while
  // its previous-keys ref survived — the next conditional pane unmount then
  // called removeView(index) past the end of the (empty) view list and threw
  // "Index out of bounds". allotment 1.18.1 threw here; 1.20.6 does not
  // (#913), so unkeyed panes now survive the cycle. The hook stays until the
  // workaround is retired on its own; if this starts throwing again after an
  // allotment change, the keyed test below is what keeps the app safe.
  it('survives pane unmount after a reveal without the workaround (fixed upstream)', async () => {
    const { rerender } = render(
      <Harness Panes={PlainPanes} showRight={true} suspended={false} />,
    )
    expect(screen.getByTestId('right-pane')).toBeDefined()

    await suspendAndReveal(rerender, PlainPanes, true)

    rerender(<Harness Panes={PlainPanes} showRight={false} suspended={false} />)
    expect(screen.queryByTestId('right-pane')).toBeNull()

    rerender(<Harness Panes={PlainPanes} showRight={true} suspended={false} />)
    expect(screen.getByTestId('right-pane')).toBeDefined()
  })

  it('survives pane unmount after a reveal when keyed by useRemountKeyOnReveal', async () => {
    const { rerender } = render(
      <Harness Panes={KeyedPanes} showRight={true} suspended={false} />,
    )
    expect(screen.getByTestId('right-pane')).toBeDefined()

    await suspendAndReveal(rerender, KeyedPanes, true)

    rerender(<Harness Panes={KeyedPanes} showRight={false} suspended={false} />)
    expect(screen.queryByTestId('right-pane')).toBeNull()

    // And the pane can come back.
    rerender(<Harness Panes={KeyedPanes} showRight={true} suspended={false} />)
    expect(screen.getByTestId('right-pane')).toBeDefined()
  })
})

describe('useRemountKeyOnReveal', () => {
  it('keeps the key stable across ordinary re-renders', () => {
    const keys: number[] = []
    const Probe = (): null => {
      keys.push(useRemountKeyOnReveal())
      return null
    }
    const { rerender } = render(<Probe />)
    rerender(<Probe />)
    rerender(<Probe />)
    expect(new Set(keys).size).toBe(1)
  })

  // The production app runs under StrictMode, whose dev double invoke replays
  // effect cleanup + setup inside the mount commit — in the layout phase this
  // is indistinguishable from a Suspense reveal. The passive-effect
  // mount-settled gate is what keeps it from bumping the key at mount.
  it('keeps the key at 0 through a StrictMode mount', () => {
    const keys: number[] = []
    const Probe = (): null => {
      keys.push(useRemountKeyOnReveal())
      return null
    }
    const { rerender } = render(
      <StrictMode>
        <Probe />
      </StrictMode>,
    )
    rerender(
      <StrictMode>
        <Probe />
      </StrictMode>,
    )
    expect(keys.length).toBeGreaterThan(0)
    expect(keys.every((key) => key === 0)).toBe(true)
  })

  it('still changes the key after a hide/reveal cycle under StrictMode', async () => {
    const keys: number[] = []
    const Probe = (): null => {
      keys.push(useRemountKeyOnReveal())
      return null
    }
    const ProbeHarness = ({
      suspended,
    }: {
      suspended: boolean
    }): ReactElement => (
      <StrictMode>
        <Suspense fallback={null}>
          <Gate suspended={suspended} />
          <Probe />
        </Suspense>
      </StrictMode>
    )
    const { rerender } = render(<ProbeHarness suspended={false} />)
    expect(keys[keys.length - 1]).toBe(0)

    rerender(<ProbeHarness suspended={true} />)
    await act(async () => {
      releaseGate?.()
      await gate
    })
    rerender(<ProbeHarness suspended={false} />)

    expect(keys[keys.length - 1]).toBe(1)
  })

  it('changes the key after a Suspense hide/reveal cycle', async () => {
    const keys: number[] = []
    const Probe = (): null => {
      keys.push(useRemountKeyOnReveal())
      return null
    }
    const ProbeHarness = ({
      suspended,
    }: {
      suspended: boolean
    }): ReactElement => (
      <Suspense fallback={null}>
        <Gate suspended={suspended} />
        <Probe />
      </Suspense>
    )
    const { rerender } = render(<ProbeHarness suspended={false} />)
    const initialKey = keys[keys.length - 1]

    rerender(<ProbeHarness suspended={true} />)
    await act(async () => {
      releaseGate?.()
      await gate
    })
    rerender(<ProbeHarness suspended={false} />)

    expect(keys[keys.length - 1]).toBe(initialKey + 1)
  })
})
