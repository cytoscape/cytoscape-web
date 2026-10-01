import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearAuthReturnLocation,
  restoreAuthReturnLocation,
  saveAuthReturnLocation,
} from './authReturnLocation'

describe('authReturnLocation', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
    window.history.replaceState({}, '', '/')
  })

  it('saves the current path and canonicalized query parameters', () => {
    window.history.replaceState(
      {},
      '',
      '/?import=http://localhost:8000/valid{1}.cx2',
    )

    saveAuthReturnLocation('/')

    const stored = sessionStorage.getItem('cyweb:keycloak:return-location')

    expect(stored).not.toBeNull()

    const record = JSON.parse(stored as string)

    expect(record.relativeUrl).toBe(
      '/?import=http%3A%2F%2Flocalhost%3A8000%2Fvalid%7B1%7D.cx2',
    )
  })

  it('restores a valid saved location', () => {
    window.history.replaceState({}, '', '/')

    sessionStorage.setItem(
      'cyweb:keycloak:return-location',
      JSON.stringify({
        relativeUrl: '/0/networks/abc?left=open',
        createdAt: Date.now(),
      }),
    )

    restoreAuthReturnLocation('/')

    expect(window.location.pathname).toBe('/0/networks/abc')
    expect(window.location.search).toBe('?left=open')
    expect(
      sessionStorage.getItem('cyweb:keycloak:return-location'),
    ).toBeNull()
  })

  it('rejects a stale saved location', () => {
    sessionStorage.setItem(
      'cyweb:keycloak:return-location',
      JSON.stringify({
        relativeUrl: '/0/networks/abc',
        createdAt: Date.now() - 6 * 60 * 1000,
      }),
    )

    restoreAuthReturnLocation('/')

    expect(window.location.pathname).toBe('/')
    expect(
      sessionStorage.getItem('cyweb:keycloak:return-location'),
    ).toBeNull()
  })

  it('rejects a location outside the application base path', () => {
    sessionStorage.setItem(
      'cyweb:keycloak:return-location',
      JSON.stringify({
        relativeUrl: '/other/path',
        createdAt: Date.now(),
      }),
    )

    restoreAuthReturnLocation('/cytoscape/')

    expect(window.location.pathname).toBe('/')
  })

  it('clears a saved location', () => {
    sessionStorage.setItem(
      'cyweb:keycloak:return-location',
      JSON.stringify({
        relativeUrl: '/network',
        createdAt: Date.now(),
      }),
    )

    clearAuthReturnLocation()

    expect(
      sessionStorage.getItem('cyweb:keycloak:return-location'),
    ).toBeNull()
  })
})
