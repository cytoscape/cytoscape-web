import React, { Suspense, useEffect, useState } from 'react'

import { BootShell } from '../boot/shell/BootShell'

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
  authResolution: Promise<AuthResolution>
  onVerify: () => void
  onCancel: () => void
}

/**
 * Renders the app immediately (BootShell while the app chunk streams in)
 * instead of blocking the first render on the SSO check. When the check
 * resolves for a logged-in user with an unverified email, the app is swapped
 * out for the verification modal — everyone else never notices the swap.
 */
export const AppBootstrap = ({
  authResolution,
  onVerify,
  onCancel,
}: AppBootstrapProps): JSX.Element => {
  const [auth, setAuth] = useState<AuthResolution | null>(null)

  useEffect(() => {
    let active = true
    void authResolution.then((resolution) => {
      if (active) {
        setAuth(resolution)
      }
    })
    return () => {
      active = false
    }
  }, [authResolution])

  const needsEmailVerification =
    auth !== null && auth.authenticated && auth.isEmailUnverified

  return (
    <Suspense fallback={<BootShell message="Loading application..." />}>
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
