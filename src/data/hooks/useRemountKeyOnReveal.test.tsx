import { act, render, screen } from '@testing-library/react'
import { Allotment } from 'allotment'
import { ReactElement, Suspense } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

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

const Harness = ({ Panes, showRight, suspended }: HarnessProps): ReactElement => (
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
  // Pins the upstream allotment bug this hook works around: React 18 destroys
  // and re-attaches the subtree's effects around a Suspense hide/reveal, which
  // recreates allotment's internal split view empty while its previous-keys
  // ref survives — the next conditional pane unmount then calls
  // removeView(index) past the end of the (empty) view list. If an allotment
  // upgrade makes this pass, the workaround can be retired.
  it('throws Index out of bounds on pane unmount after a reveal (upstream bug)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // React re-reports commit-phase errors through the window 'error' event
    // (bypassing the console mock); swallow the expected one to keep quiet
    // test output clean.
    const swallowExpected = (event: ErrorEvent): void => {
      if (event.message.includes('Index out of bounds')) {
        event.preventDefault()
      }
    }
    window.addEventListener('error', swallowExpected)
    const { rerender } = render(
      <Harness Panes={PlainPanes} showRight={true} suspended={false} />,
    )
    expect(screen.getByTestId('right-pane')).toBeDefined()

    await suspendAndReveal(rerender, PlainPanes, true)

    try {
      expect(() =>
        rerender(
          <Harness Panes={PlainPanes} showRight={false} suspended={false} />,
        ),
      ).toThrow('Index out of bounds')
    } finally {
      window.removeEventListener('error', swallowExpected)
    }
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

  it('changes the key after a Suspense hide/reveal cycle', async () => {
    const keys: number[] = []
    const Probe = (): null => {
      keys.push(useRemountKeyOnReveal())
      return null
    }
    const ProbeHarness = ({ suspended }: { suspended: boolean }): ReactElement => (
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
