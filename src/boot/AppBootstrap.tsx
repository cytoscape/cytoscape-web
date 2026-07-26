import React, { Suspense, useSyncExternalStore } from 'react'

import { BootShell } from './shell/BootShell'
import type { AuthResolutionSource } from './startAuthentication'

// Kick off the heavy application chunks immediately, at module-load time, so
// they download in parallel with the keycloak silent-SSO round-trip. As
// static imports they would serialize the boot: full bundle download and
// parse first, SSO check after.
const appModulePromise = import('../App')
const featureAvailabilityPromise = import('../features/FeatureAvailability')
const emailVerificationPromise = import('../features/EmailVerification')

const App = React.lazy(() =>
  appModulePromise.then((module) => ({ default: module.App })),
)
const FeatureAvailabilityProvider = React.lazy(() =>
  featureAvailabilityPromise.then((module) => ({
    default: module.FeatureAvailabilityProvider,
  })),
)
const EmailVerificationModal = React.lazy(() => emailVerificationPromise)

/**
 * Terminal outcome of the boot SSO check, delivered asynchronously while the
 * app is already rendering (optimistic render).
 */
export interface AuthResolution {
  authenticated: boolean
  isEmailUnverified: boolean
  userName: string
  userEmail: string
}

interface AppBootstrapProps {
  authResolution: AuthResolutionSource
  onVerify: () => void
  onCancel: () => void
}

/**
 * Renders the app immediately (BootShell while the app chunk streams in)
 * instead of blocking the first render on the SSO check. When the check
 * resolves for a logged-in user with an unverified email, the app is swapped
 * out for the verification modal — everyone else never notices the swap.
 *
 * Subscribes rather than awaiting a promise so that a slow SSO check which
 * lost the race against the 4s watchdog can still correct the outcome when it
 * arrives.
 */
export const AppBootstrap = ({
  authResolution,
  onVerify,
  onCancel,
}: AppBootstrapProps): JSX.Element => {
  const auth = useSyncExternalStore(
    authResolution.subscribe,
    authResolution.get,
    authResolution.get,
  )

  const needsEmailVerification =
    auth !== null && auth.authenticated && auth.isEmailUnverified

  return (
    <Suspense fallback={<BootShell />}>
      {needsEmailVerification ? (
        <EmailVerificationModal
          userName={auth.userName}
          userEmail={auth.userEmail}
          onVerify={onVerify}
          onCancel={onCancel}
        />
      ) : (
        <FeatureAvailabilityProvider>
          <App />
        </FeatureAvailabilityProvider>
      )}
    </Suspense>
  )
}
