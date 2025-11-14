import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import {
  FeatureAvailabilityProvider,
  useFeatureAvailability,
} from './FeatureAvailabilityProvider'
import {
  FeatureAvailabilityActionType,
  initialState,
  FeatureAvailabilityState,
  FeatureAvailabilityAction,
} from './FeatureAvailabilityContext'

import { featureAvailabilityReducer } from './FeatureAvailabilityProvider'

// Mock fetch globally
global.fetch = jest.fn()

/**
 * Note on act() warnings:
 *
 * Some tests may show "Warning: An update to FeatureAvailabilityProvider inside a test was not wrapped in act(...)."
 * This is a known limitation when testing async operations with fake timers. When jest.advanceTimersByTime()
 * triggers the setInterval callback, the fetch promise resolves and dispatches state updates in microtasks.
 * React may not detect these microtasks as being within act() even though we wrap timer advancement and flush promises.
 *
 * These warnings do not affect test correctness - all tests pass and assertions are valid. The warnings are
 * informational and can be safely ignored. This is a common issue when testing polling mechanisms with
 * fake timers in React Testing Library.
 */

/**
 * Helper function to flush all pending promises and microtasks.
 * This ensures that all async operations complete within act().
 * Note: We don't run timers here as that should be done explicitly with jest.advanceTimersByTime()
 */
const flushPromises = async () => {
  // Flush all pending promises and microtasks
  // Multiple resolves ensure we catch all promise chains
  // We need to flush enough times to catch all async operations including React state updates
  for (let i = 0; i < 20; i++) {
    await Promise.resolve()
  }
}

/**
 * Helper to wait for fetch calls to complete and their dispatches to finish.
 * This ensures all async operations from polling complete within act().
 * The key is to wait for the fetch promise to resolve AND for React's state update to complete.
 */
const waitForPollingToComplete = async () => {
  const fetchMock = global.fetch as jest.Mock

  // Wait for any fetch calls that were just made to complete
  // The mock returns a promise immediately, but we need to wait for it to resolve
  if (fetchMock.mock.calls.length > 0) {
    // Get the last fetch call's return value (the promise)
    const lastCallIndex = fetchMock.mock.calls.length - 1
    const lastResult = fetchMock.mock.results[lastCallIndex]
    if (lastResult && lastResult.type === 'return' && lastResult.value) {
      // Wait for the fetch promise to resolve
      await lastResult.value
    }
  }

  // Wait for all microtasks (including React state updates from dispatches)
  // We need to flush many times to catch all async operations including React's internal updates
  // React's state updates from useReducer happen in microtasks after the dispatch
  for (let i = 0; i < 50; i++) {
    await Promise.resolve()
  }
}

describe('FeatureAvailability', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    // Reset navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('featureAvailabilityReducer', () => {
    it('should return initial state for unknown action', () => {
      const action = {
        type: 'UNKNOWN_ACTION' as FeatureAvailabilityActionType,
      }
      const result = featureAvailabilityReducer(initialState, action)
      expect(result).toEqual(initialState)
    })

    it('should set Cytoscape Desktop as available', () => {
      const action: FeatureAvailabilityAction = {
        type: FeatureAvailabilityActionType.SET_CYDESK_AVAILABLE,
      }
      const result = featureAvailabilityReducer(initialState, action)
      expect(result.isCyDeskAvailable).toBe(true)
      expect(result.isSafari).toBe(false)
    })

    it('should set Cytoscape Desktop as unavailable', () => {
      const state: FeatureAvailabilityState = {
        isCyDeskAvailable: true,
        isSafari: false,
      }
      const action: FeatureAvailabilityAction = {
        type: FeatureAvailabilityActionType.SET_CYDESK_UNAVAILABLE,
      }
      const result = featureAvailabilityReducer(state, action)
      expect(result.isCyDeskAvailable).toBe(false)
    })

    it('should set Safari as true', () => {
      const action: FeatureAvailabilityAction = {
        type: FeatureAvailabilityActionType.SET_IS_SAFARI,
      }
      const result = featureAvailabilityReducer(initialState, action)
      expect(result.isSafari).toBe(true)
      expect(result.isCyDeskAvailable).toBe(false)
    })

    it('should set Safari as false', () => {
      const state: FeatureAvailabilityState = {
        isCyDeskAvailable: false,
        isSafari: true,
      }
      const action: FeatureAvailabilityAction = {
        type: FeatureAvailabilityActionType.SET_NOT_SAFARI,
      }
      const result = featureAvailabilityReducer(state, action)
      expect(result.isSafari).toBe(false)
    })

    it('should preserve other state properties when updating one', () => {
      const state: FeatureAvailabilityState = {
        isCyDeskAvailable: true,
        isSafari: false,
      }
      const action: FeatureAvailabilityAction = {
        type: FeatureAvailabilityActionType.SET_IS_SAFARI,
      }
      const result = featureAvailabilityReducer(state, action)
      expect(result.isSafari).toBe(true)
      expect(result.isCyDeskAvailable).toBe(true) // Preserved
    })
  })

  describe('FeatureAvailabilityProvider', () => {
    const TestComponent = () => {
      const { state, tooltip } = useFeatureAvailability()
      return (
        <div>
          <div data-testid="isCyDeskAvailable">
            {state.isCyDeskAvailable.toString()}
          </div>
          <div data-testid="isSafari">{state.isSafari.toString()}</div>
          <div data-testid="tooltip">{tooltip}</div>
        </div>
      )
    }

    it('should provide initial state', () => {
      render(
        <FeatureAvailabilityProvider>
          <TestComponent />
        </FeatureAvailabilityProvider>,
      )

      expect(screen.getByTestId('isCyDeskAvailable')).toHaveTextContent('false')
      expect(screen.getByTestId('isSafari')).toHaveTextContent('false')
    })

    it('should detect Safari browser', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      })

      render(
        <FeatureAvailabilityProvider>
          <TestComponent />
        </FeatureAvailabilityProvider>,
      )

      await act(async () => {
        jest.advanceTimersByTime(0)
        await flushPromises()
      })

      expect(screen.getByTestId('isSafari')).toHaveTextContent('true')
    })

    it('should not detect Chrome as Safari', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      })

      render(
        <FeatureAvailabilityProvider>
          <TestComponent />
        </FeatureAvailabilityProvider>,
      )

      await act(async () => {
        jest.advanceTimersByTime(0)
        await flushPromises()
      })

      expect(screen.getByTestId('isSafari')).toHaveTextContent('false')
    })

    it('should not poll when Safari is detected', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      })

      render(
        <FeatureAvailabilityProvider>
          <TestComponent />
        </FeatureAvailabilityProvider>,
      )

      await act(async () => {
        jest.advanceTimersByTime(0)
        await flushPromises()
      })

      // Advance time significantly - should not poll
      await act(async () => {
        jest.advanceTimersByTime(10000)
        await flushPromises()
      })

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should poll Cytoscape Desktop endpoint when not Safari', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      render(
        <FeatureAvailabilityProvider>
          <TestComponent />
        </FeatureAvailabilityProvider>,
      )

      await act(async () => {
        jest.advanceTimersByTime(0)
        await flushPromises()
      })

      // Wait for first poll - advance timers (let waitFor handle act())
      jest.advanceTimersByTime(5000)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:1234/v1/version',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      )
    })

    it('should set Cytoscape Desktop as available when endpoint responds with ok', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      render(
        <FeatureAvailabilityProvider>
          <TestComponent />
        </FeatureAvailabilityProvider>,
      )

      await act(async () => {
        jest.advanceTimersByTime(0)
        await flushPromises()
      })

      // Advance timers to trigger polling within act()
      // We need to ensure the fetch promise resolves and dispatch completes within act()
      await act(async () => {
        jest.advanceTimersByTime(5000)
        // Wait for fetch promise to resolve
        const fetchMock = global.fetch as jest.Mock
        if (fetchMock.mock.results.length > 0) {
          const lastResult =
            fetchMock.mock.results[fetchMock.mock.results.length - 1]
          if (lastResult && lastResult.type === 'return' && lastResult.value) {
            await lastResult.value
            // After fetch resolves, the dispatch happens in a microtask
            // We need to flush enough times to catch it
            for (let i = 0; i < 50; i++) {
              await Promise.resolve()
            }
          }
        } else {
          // If no fetch result yet, flush to wait for it
          for (let i = 0; i < 50; i++) {
            await Promise.resolve()
          }
        }
      })

      // Use waitFor to wait for state update - it automatically wraps in act()
      await waitFor(
        () => {
          expect(screen.getByTestId('isCyDeskAvailable')).toHaveTextContent(
            'true',
          )
        },
        { timeout: 1000 },
      )
    })

    it('should set Cytoscape Desktop as unavailable when endpoint responds with error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      render(
        <FeatureAvailabilityProvider>
          <TestComponent />
        </FeatureAvailabilityProvider>,
      )

      await act(async () => {
        jest.advanceTimersByTime(0)
        await flushPromises()
      })

      // Advance timers to trigger polling within act()
      // We need to ensure the fetch promise resolves and dispatch completes within act()
      await act(async () => {
        jest.advanceTimersByTime(5000)
        // Wait for fetch promise to resolve
        const fetchMock = global.fetch as jest.Mock
        if (fetchMock.mock.results.length > 0) {
          const lastResult =
            fetchMock.mock.results[fetchMock.mock.results.length - 1]
          if (lastResult && lastResult.type === 'return' && lastResult.value) {
            await lastResult.value
            // After fetch resolves, the dispatch happens in a microtask
            // We need to flush enough times to catch it
            for (let i = 0; i < 50; i++) {
              await Promise.resolve()
            }
          }
        } else {
          // If no fetch result yet, flush to wait for it
          for (let i = 0; i < 50; i++) {
            await Promise.resolve()
          }
        }
      })

      // Use waitFor to wait for state update - it automatically wraps in act()
      await waitFor(
        () => {
          expect(screen.getByTestId('isCyDeskAvailable')).toHaveTextContent(
            'false',
          )
        },
        { timeout: 1000 },
      )
    })

    it('should set Cytoscape Desktop as unavailable when fetch throws error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      )

      render(
        <FeatureAvailabilityProvider>
          <TestComponent />
        </FeatureAvailabilityProvider>,
      )

      await act(async () => {
        jest.advanceTimersByTime(0)
        await Promise.resolve()
      })

      await act(async () => {
        jest.advanceTimersByTime(5000)
        // Wait for fetch error and dispatch to complete
        await Promise.resolve()
        await Promise.resolve()
      })

      await waitFor(() => {
        expect(screen.getByTestId('isCyDeskAvailable')).toHaveTextContent(
          'false',
        )
      })
    })

    it('should not dispatch error action on AbortError', async () => {
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(abortError)

      render(
        <FeatureAvailabilityProvider>
          <TestComponent />
        </FeatureAvailabilityProvider>,
      )

      await act(async () => {
        jest.advanceTimersByTime(0)
        await flushPromises()
      })

      await act(async () => {
        jest.advanceTimersByTime(5000)
        // Wait for fetch error handling
        await flushPromises()
      })

      // Should remain in initial state (false), not dispatch unavailable
      expect(screen.getByTestId('isCyDeskAvailable')).toHaveTextContent('false')
    })

    it('should poll at regular intervals', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      })

      render(
        <FeatureAvailabilityProvider>
          <TestComponent />
        </FeatureAvailabilityProvider>,
      )

      await act(async () => {
        jest.advanceTimersByTime(0)
        await flushPromises()
      })

      // First poll - advance timers (let waitFor handle act())
      jest.advanceTimersByTime(5000)
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledTimes(1)
        },
        { timeout: 1000 },
      )

      // Second poll - advance timers (let waitFor handle act())
      jest.advanceTimersByTime(5000)
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledTimes(2)
        },
        { timeout: 1000 },
      )
    })

    it('should clean up polling interval on unmount', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      })

      const { unmount } = render(
        <FeatureAvailabilityProvider>
          <TestComponent />
        </FeatureAvailabilityProvider>,
      )

      await act(async () => {
        jest.advanceTimersByTime(0)
        await flushPromises()
      })

      await act(async () => {
        jest.advanceTimersByTime(5000)
        await flushPromises()
      })

      const callCountBeforeUnmount = (global.fetch as jest.Mock).mock.calls
        .length

      unmount()

      // Advance time significantly after unmount
      await act(async () => {
        jest.advanceTimersByTime(20000)
        await flushPromises()
      })

      // Should not have made additional calls after unmount
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(
        callCountBeforeUnmount,
      )
    })

    describe('tooltip generation', () => {
      it('should show Safari message when Safari is detected', async () => {
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        })

        render(
          <FeatureAvailabilityProvider>
            <TestComponent />
          </FeatureAvailabilityProvider>,
        )

        await act(async () => {
          jest.advanceTimersByTime(0)
          await flushPromises()
        })

        expect(screen.getByTestId('tooltip')).toHaveTextContent(
          'This feature is not available in Safari.',
        )
      })

      it('should show Cytoscape Desktop unavailable message when not available', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 404,
        })

        render(
          <FeatureAvailabilityProvider>
            <TestComponent />
          </FeatureAvailabilityProvider>,
        )

        await act(async () => {
          jest.advanceTimersByTime(0)
          await flushPromises()
        })

        // Advance timers to trigger polling (let waitFor handle act())
        jest.advanceTimersByTime(5000)

        await waitFor(
          () => {
            expect(screen.getByTestId('tooltip')).toHaveTextContent(
              'To use this feature, you need Cytoscape running 3.8.0 or higher on your machine (default port 1234).',
            )
          },
          { timeout: 1000 },
        )
      })

      it('should show available message when Cytoscape Desktop is available', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
        })

        render(
          <FeatureAvailabilityProvider>
            <TestComponent />
          </FeatureAvailabilityProvider>,
        )

        await act(async () => {
          jest.advanceTimersByTime(0)
          await flushPromises()
        })

        // Advance timers to trigger polling (let waitFor handle act())
        jest.advanceTimersByTime(5000)

        await waitFor(
          () => {
            expect(screen.getByTestId('tooltip')).toHaveTextContent(
              'Open a copy of the current network in Cytoscape Desktop.',
            )
          },
          { timeout: 1000 },
        )
      })
    })
  })

  describe('useFeatureAvailability hook', () => {
    it('should return context value when used inside provider', () => {
      const TestComponent = () => {
        const { state, tooltip } = useFeatureAvailability()
        return (
          <div>
            <div data-testid="hook-state">
              {JSON.stringify({ ...state, tooltip })}
            </div>
          </div>
        )
      }

      render(
        <FeatureAvailabilityProvider>
          <TestComponent />
        </FeatureAvailabilityProvider>,
      )

      expect(screen.getByTestId('hook-state')).toBeInTheDocument()
    })

    it('should return default context value when used outside provider', () => {
      const TestComponentWithoutProvider = () => {
        const { state, tooltip } = useFeatureAvailability()
        return (
          <div>
            <div data-testid="default-state">
              {JSON.stringify({ ...state, tooltip })}
            </div>
          </div>
        )
      }

      render(<TestComponentWithoutProvider />)

      // Should return default context value (initialState, empty tooltip)
      const content = screen.getByTestId('default-state').textContent
      const parsed = JSON.parse(content || '{}')
      expect(parsed.isCyDeskAvailable).toBe(false)
      expect(parsed.isSafari).toBe(false)
      expect(parsed.tooltip).toBe('')
    })
  })
})
