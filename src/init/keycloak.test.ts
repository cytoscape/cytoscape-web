import { describe, expect, it } from 'vitest'

import { buildKeycloakInitOptions } from './keycloak'

describe('buildKeycloakInitOptions', () => {
  it('skips SSO check entirely on local dev hosts', () => {
    const options = buildKeycloakInitOptions(true, '/')

    expect(options).toEqual({ checkLoginIframe: false })
  })

  it('uses silent check-sso against silent-check-sso.html on deployed hosts', () => {
    const options = buildKeycloakInitOptions(false, '/')

    expect(options.onLoad).toEqual('check-sso')
    expect(options.checkLoginIframe).toEqual(false)
    expect(options.silentCheckSsoRedirectUri).toEqual(
      window.location.origin + '/silent-check-sso.html',
    )
  })

  // CW-663: when third-party cookies are blocked (incognito), keycloak-js
  // falls back from silent check-sso to a full-page redirect that sends
  // location.href — including user-supplied params such as ?import=<url> —
  // as redirect_uri, which NDEx Keycloak can reject with
  // "Invalid parameter: redirect_uri". The fallback must stay disabled.
  it('disables the full-page redirect fallback for silent check-sso', () => {
    const options = buildKeycloakInitOptions(false, '/')

    expect(options.silentCheckSsoFallback).toEqual(false)
  })
})
