import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resetBootStateForTesting, setBootError } from '../../boot/bootState'
import {
  markWorkspaceHydrated,
  resetWorkspaceHydratedForTesting,
} from '../../boot/workspaceHydrated'
import { OnboardingHost } from './OnboardingHost'
import { useOnboardingStore } from './store/OnboardingStore'

const WELCOME = 'onboarding-welcome-dialog'

const fireReady = (): void => {
  act(() => {
    window.dispatchEvent(new CustomEvent('cywebapi:ready'))
  })
}

describe('OnboardingHost readiness gating', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetBootStateForTesting()
    resetWorkspaceHydratedForTesting()
    useOnboardingStore.getState().reset()
  })

  afterEach(() => {
    resetBootStateForTesting()
    resetWorkspaceHydratedForTesting()
  })

  it('stays hidden until the workspace is hydrated', () => {
    render(<OnboardingHost />)
    expect(screen.queryByTestId(WELCOME)).toBeNull()

    fireReady()
    expect(screen.getByTestId(WELCOME)).toBeTruthy()
  })

  it('surfaces when hydration already happened before it mounted', () => {
    // `cywebapi:ready` is a one-shot: a host mounting after publishWorkspace has
    // no event left to hear, which is what the durable flag is for. Regression
    // guard for the blind 8s timer this replaced.
    markWorkspaceHydrated()

    render(<OnboardingHost />)

    expect(screen.getByTestId(WELCOME)).toBeTruthy()
  })

  it('stays hidden when the boot failed terminally', () => {
    // The boot shell is showing an error screen; a welcome dialog on top of it
    // onboards the user into an app that never opened.
    setBootError({ title: 'Boom', message: 'no database' })
    markWorkspaceHydrated()

    render(<OnboardingHost />)

    expect(screen.queryByTestId(WELCOME)).toBeNull()
  })

  it('does not reappear once the welcome has been seen', () => {
    act(() => {
      useOnboardingStore.getState().markWelcomeSeen()
    })
    markWorkspaceHydrated()

    render(<OnboardingHost />)

    expect(screen.queryByTestId(WELCOME)).toBeNull()
  })
})
