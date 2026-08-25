import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearInternalHistory,
  getDebugState,
  navigateToNetwork,
  updateSearchParams,
} from './urlManager'

/**
 * First test coverage for the URL-as-state manager (previously 16.6%
 * statements). The module keeps singleton state (throttle timestamps,
 * in-progress flags, internal history), reset via clearInternalHistory().
 */
describe('urlManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-20T12:00:00Z'))
    clearInternalHistory()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    clearInternalHistory()
  })

  const advance = (ms: number): void => {
    vi.advanceTimersByTime(ms)
    vi.setSystemTime(Date.now() + 0) // fake timers keep Date.now in sync
  }

  describe('navigateToNetwork', () => {
    it('builds the network path with search parameters', () => {
      const navigate = vi.fn()

      navigateToNetwork(
        {
          workspaceId: 'ws-1',
          networkId: 'net-1',
          searchParams: new URLSearchParams({ panel: 'open' }),
          replace: false,
        },
        navigate,
      )

      expect(navigate).toHaveBeenCalledWith('/ws-1/networks/net-1?panel=open', {
        replace: false,
      })
    })

    it('builds the workspace-only path when no network id is given', () => {
      const navigate = vi.fn()

      navigateToNetwork(
        {
          workspaceId: 'ws-1',
          networkId: '',
          searchParams: new URLSearchParams(),
          replace: false,
        },
        navigate,
      )

      expect(navigate).toHaveBeenCalledWith('/ws-1/networks', {
        replace: false,
      })
    })

    it('throttles a second navigation within 300ms (documented lossy behavior)', () => {
      const navigate = vi.fn()
      const config = (networkId: string) => ({
        workspaceId: 'ws-1',
        networkId,
        searchParams: new URLSearchParams(),
        replace: false,
      })

      navigateToNetwork(config('net-1'), navigate)
      navigateToNetwork(config('net-2'), navigate)

      // The second call is silently dropped — store state and URL can
      // diverge whenever two navigations occur quickly (REVIEW.md
      // architecture note); this test documents the trade-off.
      expect(navigate).toHaveBeenCalledTimes(1)
    })

    it('allows navigation again after the throttle window', () => {
      const navigate = vi.fn()
      const config = (networkId: string) => ({
        workspaceId: 'ws-1',
        networkId,
        searchParams: new URLSearchParams(),
        replace: false,
      })

      navigateToNetwork(config('net-1'), navigate)
      advance(400) // past throttle AND the isHandlingNavigation reset

      navigateToNetwork(config('net-2'), navigate)

      expect(navigate).toHaveBeenCalledTimes(2)
      expect(navigate).toHaveBeenLastCalledWith('/ws-1/networks/net-2', {
        replace: false,
      })
    })

    it('skips navigation to the exact same path', () => {
      const navigate = vi.fn()
      const config = {
        workspaceId: 'ws-1',
        networkId: 'net-1',
        searchParams: new URLSearchParams(),
        replace: false,
      }

      navigateToNetwork(config, navigate)
      advance(400)
      navigateToNetwork(config, navigate)

      expect(navigate).toHaveBeenCalledTimes(1)
    })

    it('forces replace=true when re-navigating to the same network id', () => {
      const navigate = vi.fn()

      navigateToNetwork(
        {
          workspaceId: 'ws-1',
          networkId: 'net-1',
          searchParams: new URLSearchParams(),
          replace: false,
        },
        navigate,
      )
      advance(400)
      navigateToNetwork(
        {
          workspaceId: 'ws-1',
          networkId: 'net-1',
          searchParams: new URLSearchParams({ tab: '2' }),
          replace: false,
        },
        navigate,
      )

      expect(navigate).toHaveBeenLastCalledWith('/ws-1/networks/net-1?tab=2', {
        replace: true,
      })
    })
  })

  describe('updateSearchParams', () => {
    it('sets and deletes keys and always uses replace', () => {
      const setSearchParams = vi.fn()
      const params = new URLSearchParams({ keep: '1', drop: '2' })

      updateSearchParams(
        params,
        { drop: null, added: '3' },
        setSearchParams,
        false, // even when the caller asks for replace=false
      )

      expect(setSearchParams).toHaveBeenCalledTimes(1)
      const [newParams, options] = setSearchParams.mock.calls[0]
      expect(newParams.get('keep')).toBe('1')
      expect(newParams.get('drop')).toBeNull()
      expect(newParams.get('added')).toBe('3')
      expect(options).toEqual({ replace: true })
    })
  })

  describe('clearInternalHistory', () => {
    it('resets all singleton navigation state', () => {
      const navigate = vi.fn()
      navigateToNetwork(
        {
          workspaceId: 'ws-1',
          networkId: 'net-1',
          searchParams: new URLSearchParams(),
          replace: false,
        },
        navigate,
      )

      clearInternalHistory()

      const state = getDebugState()
      expect(state.lastNetworkId).toBe('')
      expect(state.lastUrlPath).toBe('')
      expect(state.navigationCount).toBe(0)
      expect(state.isHandlingNavigation).toBe(false)
    })
  })
})
