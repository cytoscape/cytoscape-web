import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  resetAuthGateForTesting,
  useCredentialStore,
} from '@/data/hooks/stores/CredentialStore'

import { resetBootMetricsForTesting } from './metrics/bootMarks'
import {
  AUTH_INIT_TIMEOUT_MS,
  startAuthentication,
} from './startAuthentication'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const makeKeycloak = (init: Promise<boolean>) =>
  ({ init: vi.fn().mockReturnValue(init) }) as any

// The watchdog is skipped on localhost, and jsdom reports localhost.
const onProductionHost = (): void => {
  vi.spyOn(window, 'location', 'get').mockReturnValue({
    ...window.location,
    hostname: 'app.example.com',
    origin: 'https://app.example.com',
    search: '',
  } as any)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  resetBootMetricsForTesting()
  // Several tests here leave keycloak.init pending forever, which leaves the
  // module-scope token gate closed for every suite that runs after this file.
  resetAuthGateForTesting()
})

describe('startAuthentication', () => {
  it('publishes the real outcome for a verified user', async () => {
    const source = startAuthentication({
      keycloak: makeKeycloak(Promise.resolve(true)),
      checkUserVerification: vi.fn().mockResolvedValue({ isVerified: true }),
      urlBaseName: '/',
    })

    await vi.runAllTimersAsync()

    expect(source.get()).toMatchObject({
      authenticated: true,
      isEmailUnverified: false,
    })
  })

  it('stays authenticated when the verification lookup fails', async () => {
    // The lookup is a second network call made *after* the SSO check already
    // succeeded, so its failure says nothing about whether the user is signed
    // in. Letting it reach the outer .catch published UNAUTHENTICATED for a
    // genuinely authenticated user — and since the token gate is already open
    // by then, their requests still carried credentials while the UI showed
    // them as logged out.
    const source = startAuthentication({
      keycloak: makeKeycloak(Promise.resolve(true)),
      checkUserVerification: vi
        .fn()
        .mockRejectedValue(new Error('verification endpoint down')),
      urlBaseName: '/',
    })

    await vi.runAllTimersAsync()

    expect(source.get()).toMatchObject({
      authenticated: true,
      // Not flagged unverified: that raises a modal the user cannot clear,
      // because the lookup backing it is the thing that is down.
      isEmailUnverified: false,
    })
  })

  it('releases the token gate before the verification lookup', async () => {
    // The lookup is a second network call; gating every credentialed request
    // in the app behind it would put it back on the critical path.
    let gateOpenDuringLookup = false
    const source = startAuthentication({
      keycloak: makeKeycloak(Promise.resolve(true)),
      checkUserVerification: vi.fn().mockImplementation(async () => {
        gateOpenDuringLookup =
          useCredentialStore.getState().authInitialized === true
        return { isVerified: true }
      }),
      urlBaseName: '/',
    })

    await vi.runAllTimersAsync()

    expect(gateOpenDuringLookup).toBe(true)
    expect(source.get()).not.toBeNull()
  })

  it('publishes UNAUTHENTICATED when the SSO check fails', async () => {
    const source = startAuthentication({
      keycloak: makeKeycloak(Promise.reject(new Error('network down'))),
      checkUserVerification: vi.fn(),
      urlBaseName: '/',
    })

    await vi.runAllTimersAsync()

    expect(source.get()).toMatchObject({ authenticated: false })
  })

  it('upgrades a timed-out check when the real result finally arrives', async () => {
    // The regression this guards: a settled promise could not be corrected, so
    // a slow-but-successful SSO check left a genuinely signed-in user marked
    // unauthenticated for the whole session — silently skipping the email
    // verification modal and showing them as logged out.
    onProductionHost()
    const init = deferred<boolean>()
    const source = startAuthentication({
      keycloak: makeKeycloak(init.promise),
      checkUserVerification: vi.fn().mockResolvedValue({
        isVerified: false,
        userName: 'ada',
        userEmail: 'ada@example.com',
      }),
      urlBaseName: '/',
    })

    const notified = vi.fn()
    source.subscribe(notified)

    await vi.advanceTimersByTimeAsync(AUTH_INIT_TIMEOUT_MS + 1)
    expect(source.get()).toMatchObject({ authenticated: false })

    init.resolve(true)
    await vi.runAllTimersAsync()

    expect(source.get()).toMatchObject({
      authenticated: true,
      isEmailUnverified: true,
      userName: 'ada',
    })
    expect(notified.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('opens the token gate exactly once even when the timeout races the result', async () => {
    onProductionHost()
    const init = deferred<boolean>()
    const complete = vi.spyOn(
      useCredentialStore.getState(),
      'completeAuthInitialization',
    )

    startAuthentication({
      keycloak: makeKeycloak(init.promise),
      checkUserVerification: vi.fn().mockResolvedValue({ isVerified: true }),
      urlBaseName: '/',
    })

    await vi.advanceTimersByTimeAsync(AUTH_INIT_TIMEOUT_MS + 1)
    init.resolve(true)
    await vi.runAllTimersAsync()

    expect(complete).toHaveBeenCalledTimes(1)
  })

  it('starts with no outcome published', () => {
    const source = startAuthentication({
      keycloak: makeKeycloak(new Promise(() => {})),
      checkUserVerification: vi.fn(),
      urlBaseName: '/',
    })

    expect(source.get()).toBeNull()
  })
})
