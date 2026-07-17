import { act, renderHook } from '@testing-library/react'
import Keycloak from 'keycloak-js'
import { describe, expect, it, vi } from 'vitest'

import { useCredentialStore } from './CredentialStore'

// Mock Keycloak
vi.mock('keycloak-js', () => {
  return { default: vi.fn().mockImplementation(function() {
    return {
      token: 'mock-token',
      tokenParsed: { sub: 'user-123' },
      updateToken: vi.fn().mockResolvedValue(true),
    }
  }) }
})

describe('useCredentialStore', () => {
  describe('setClient', () => {
    it('should set a Keycloak client', () => {
      const { result } = renderHook(() => useCredentialStore())
      const client = new Keycloak()

      act(() => {
        result.current.setClient(client)
      })

      expect(result.current.client).toBe(client)
    })
  })

  describe('getToken', () => {
    it('should get a token from the client', async () => {
      const { result } = renderHook(() => useCredentialStore())
      const client = new Keycloak()
      client.token = 'test-token'
      client.updateToken = vi.fn().mockResolvedValue(true)

      act(() => {
        result.current.setClient(client)
      })

      const token = await result.current.getToken()

      expect(token).toBe('test-token')
      expect(client.updateToken).toHaveBeenCalledWith(60)
    })

    it('should return empty string if token is undefined', async () => {
      const { result } = renderHook(() => useCredentialStore())
      const client = new Keycloak()
      client.token = undefined
      client.updateToken = vi.fn().mockResolvedValue(true)

      act(() => {
        result.current.setClient(client)
      })

      const token = await result.current.getToken()

      expect(token).toBe('')
    })
  })

  describe('auth initialization gating', () => {
    it('holds getToken until completeAuthInitialization is called', async () => {
      const { result } = renderHook(() => useCredentialStore())
      const client = new Keycloak()
      client.token = 'gated-token'
      client.updateToken = vi.fn().mockResolvedValue(true)

      act(() => {
        result.current.setClient(client)
        result.current.beginAuthInitialization()
      })

      expect(result.current.authInitialized).toBe(false)

      let resolvedToken: string | undefined
      const pending = result.current.getToken().then((token) => {
        resolvedToken = token
        return token
      })

      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(resolvedToken).toBeUndefined()

      act(() => {
        result.current.completeAuthInitialization()
      })

      expect(await pending).toBe('gated-token')
      expect(result.current.authInitialized).toBe(true)
    })

    it('does not gate getToken when initialization was never begun', async () => {
      const { result } = renderHook(() => useCredentialStore())
      const client = new Keycloak()
      client.token = 'ungated-token'
      client.updateToken = vi.fn().mockResolvedValue(true)

      act(() => {
        result.current.setClient(client)
      })

      expect(result.current.authInitialized).toBe(true)
      expect(await result.current.getToken()).toBe('ungated-token')
    })

    it('treats repeated begin/complete calls as idempotent', async () => {
      const { result } = renderHook(() => useCredentialStore())
      const client = new Keycloak()
      client.token = 'idempotent-token'
      client.updateToken = vi.fn().mockResolvedValue(true)

      act(() => {
        result.current.setClient(client)
        result.current.beginAuthInitialization()
        result.current.beginAuthInitialization()
        result.current.completeAuthInitialization()
        result.current.completeAuthInitialization()
      })

      expect(result.current.authInitialized).toBe(true)
      expect(await result.current.getToken()).toBe('idempotent-token')
    })
  })

  describe('getParsedToken', () => {
    it('should get a parsed token from the client', async () => {
      const { result } = renderHook(() => useCredentialStore())
      const client = new Keycloak()
      client.token = 'test-token'
      client.tokenParsed = { sub: 'user-123', name: 'Test User' }
      client.updateToken = vi.fn().mockResolvedValue(true)

      act(() => {
        result.current.setClient(client)
      })

      const parsedToken = await result.current.getParsedToken()

      expect(parsedToken).toEqual({ sub: 'user-123', name: 'Test User' })
      expect(client.updateToken).toHaveBeenCalledWith(60)
    })

    it('should return empty object if token is undefined', async () => {
      const { result } = renderHook(() => useCredentialStore())
      const client = new Keycloak()
      client.token = undefined
      client.updateToken = vi.fn().mockResolvedValue(true)

      act(() => {
        result.current.setClient(client)
      })

      const parsedToken = await result.current.getParsedToken()

      expect(parsedToken).toEqual({})
    })
  })
})

