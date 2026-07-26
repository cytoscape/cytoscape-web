import type Keycloak from 'keycloak-js'

import { useCredentialStore } from '../data/hooks/stores/CredentialStore'
import { logStartup } from '../debug'
import { ensureTrailingSlash } from '../utils/baseUrl'
import type { AuthResolution } from './AppBootstrap'
import { BootPhase } from './bootPhases'
import type { UserVerificationStatus } from './keycloak'
import { bootNow, markBoot, measureBoot } from './metrics/bootMarks'

// Keycloak silent SSO, started but never awaited.
//
// The app renders optimistically over this check (48b9ffc1): what keeps a
// logged-in user's startup fetches from going out anonymously is not ordering
// but CredentialStore's auth gate — getToken/getParsedToken block until
// completeAuthInitialization. That gate is why the invariant below matters so
// much: *every* terminal path here must complete initialization, or any
// credentialed request hangs forever.

const AUTH_INIT_TIMEOUT_MS = 4000
const LOCAL_DEV_HOSTS = new Set(['127.0.0.1', 'localhost'])

// Dev-only: `?authDelay[=ms]` holds keycloak init's resolution to simulate the
// production silent-SSO round-trip, so the boot handoff can be observed
// locally. Compiled away in production builds.
const DEFAULT_SIMULATED_AUTH_DELAY_MS = 1500

const getSimulatedAuthDelayMs = (): number => {
  if (!import.meta.env.DEV) return 0
  const raw = new URLSearchParams(window.location.search).get('authDelay')
  if (raw === null) return 0
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_SIMULATED_AUTH_DELAY_MS
}

export const UNAUTHENTICATED: AuthResolution = {
  authenticated: false,
  isEmailUnverified: false,
  userName: '',
  userEmail: '',
}

export const isLocalDevHost = (): boolean =>
  LOCAL_DEV_HOSTS.has(window.location.hostname)

export interface StartAuthenticationOptions {
  keycloak: Keycloak
  checkUserVerification: () => Promise<UserVerificationStatus>
  urlBaseName: string
}

/**
 * Kicks off the SSO check and returns a promise that settles with the outcome.
 * Never rejects: a failed or timed-out check resolves UNAUTHENTICATED, because
 * "we could not tell" and "not signed in" have the same consequence for
 * rendering, and the alternative is an unhandled rejection during boot.
 */
export const startAuthentication = ({
  keycloak,
  checkUserVerification,
  urlBaseName,
}: StartAuthenticationOptions): Promise<AuthResolution> => {
  const { beginAuthInitialization, completeAuthInitialization } =
    useCredentialStore.getState()
  beginAuthInitialization()

  const start = bootNow()
  let released = false
  let resolveAuth!: (resolution: AuthResolution) => void
  const authResolution = new Promise<AuthResolution>((resolve) => {
    resolveAuth = resolve
  })

  // Releasing the token gate and reporting the outcome are separate on
  // purpose. The gate opens the moment the SSO check itself settles; the
  // email-verification lookup that may follow is another network call, and
  // gating every credentialed request in the app behind it would put it back
  // on the critical path.
  const releaseTokenGate = (status: 'ok' | 'error' = 'ok'): void => {
    if (released) return
    released = true

    markBoot('auth-settled')
    measureBoot(BootPhase.AUTH, start, bootNow(), status)
    completeAuthInitialization()
  }

  const settle = (
    resolution: AuthResolution,
    status: 'ok' | 'error' = 'ok',
  ): void => {
    releaseTokenGate(status)
    resolveAuth(resolution)
  }

  // No watchdog on localhost: a developer pointing at a local Keycloak wants
  // to see it hang rather than have it silently downgrade to anonymous.
  const timeout = isLocalDevHost()
    ? undefined
    : window.setTimeout(() => {
        logStartup.warn(
          '[boot]: authentication timed out, continuing without SSO',
        )
        settle(UNAUTHENTICATED, 'error')
      }, AUTH_INIT_TIMEOUT_MS)

  const clearWatchdog = (): void => {
    if (timeout !== undefined) window.clearTimeout(timeout)
  }

  const initOptions = isLocalDevHost()
    ? { checkLoginIframe: false }
    : {
        onLoad: 'check-sso' as const,
        checkLoginIframe: false,
        silentCheckSsoRedirectUri:
          window.location.origin +
          ensureTrailingSlash(urlBaseName) +
          'silent-check-sso.html',
      }

  void keycloak
    .init(initOptions)
    .then(async (authenticated) => {
      const simulatedAuthDelayMs = getSimulatedAuthDelayMs()
      if (simulatedAuthDelayMs > 0) {
        logStartup.info(
          `[boot]: simulating ${simulatedAuthDelayMs}ms auth delay (authDelay URL parameter)`,
        )
        await new Promise((resolve) =>
          window.setTimeout(resolve, simulatedAuthDelayMs),
        )
      }

      clearWatchdog()
      releaseTokenGate()

      if (!authenticated) {
        settle(UNAUTHENTICATED)
        return
      }

      const status = await checkUserVerification()
      settle({
        authenticated,
        isEmailUnverified: !status.isVerified,
        userName: status.userName ?? '',
        userEmail: status.userEmail ?? '',
      })
    })
    .catch((cause) => {
      clearWatchdog()
      logStartup.warn(
        '[boot]: authentication failed, continuing without SSO',
        cause,
      )
      settle(UNAUTHENTICATED, 'error')
    })

  return authResolution
}
