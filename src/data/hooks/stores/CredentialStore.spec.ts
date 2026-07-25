import { act, renderHook } from '@testing-library/react'
import Keycloak from 'keycloak-js'
import { describe, expect, it, vi } from 'vitest'

import { useCredentialStore } from './CredentialStore'

// Mock Keycloak
vi.mock('keycloak-js', () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {
        token: 'mock-token',
        tokenParsed: { sub: 'user-123' },
        updateToken: vi.fn().mockResolvedValue(true),
      }
    }),
  }
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
