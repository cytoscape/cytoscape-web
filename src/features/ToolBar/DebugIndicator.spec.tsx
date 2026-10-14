import { act, render, screen } from '@testing-library/react'
import debug from 'debug'
import hotkeys from 'hotkeys-js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { initializeDebug } from '@/debug'

import { DebugIndicator } from './DebugIndicator'

describe('DebugIndicator', () => {
  let cleanup: (() => void) | undefined

  beforeEach(() => {
    localStorage.clear()
    debug.disable()
  })

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
  })

  it('is hidden while debug mode is off and appears when toggled on', () => {
    cleanup = initializeDebug({
      defaultEnabled: false,
      enableRenderTracking: false,
    })
    render(<DebugIndicator />)

    expect(screen.queryByTestId('debug-indicator')).toBeNull()

    act(() => {
      hotkeys.trigger('`')
    })
    expect(screen.getByTestId('debug-indicator')).toBeTruthy()

    act(() => {
      hotkeys.trigger('`')
    })
    expect(screen.queryByTestId('debug-indicator')).toBeNull()
  })

  it('is visible immediately when debug mode starts enabled', () => {
    cleanup = initializeDebug({
      defaultEnabled: true,
      enableRenderTracking: false,
    })
    render(<DebugIndicator />)

    expect(screen.getByTestId('debug-indicator')).toBeTruthy()
  })
})
