import Keycloak from 'keycloak-js'

import {
  CredentialState,
  getParsedToken,
  getToken,
  setClient,
} from './credentialStoreImpl'

const createDefaultState = (): CredentialState => {
  const client = new Keycloak()
  return {
    client,
  }
}

describe('CredentialStoreImpl', () => {
  describe('setClient', () => {
    it('should set a Keycloak client', () => {
      const state = createDefaultState()
      const newClient = new Keycloak()

      const result = setClient(state, newClient)

      expect(result.client).toBe(newClient)
      expect(result).not.toBe(state) // Immutability check
      expect(state.client).not.toBe(newClient) // Original unchanged
    })
  })

  describe('getToken', () => {
    it('should get a token from the client', async () => {
      const state = createDefaultState()
      const client = new Keycloak()
      client.token = 'test-token'
      client.updateToken = jest.fn().mockResolvedValue(true)

      const stateWithClient = setClient(state, client)

      const token = await getToken(stateWithClient)

      expect(token).toBe('test-token')
      expect(client.updateToken).toHaveBeenCalledWith(60)
    })

    it('should return empty string if token is undefined', async () => {
      const state = createDefaultState()
      const client = new Keycloak()
      client.token = undefined
      client.updateToken = jest.fn().mockResolvedValue(true)

      const stateWithClient = setClient(state, client)

      const token = await getToken(stateWithClient)

      expect(token).toBe('')
    })
  })

  describe('getParsedToken', () => {
    it('should get a parsed token from the client', async () => {
      const state = createDefaultState()
      const client = new Keycloak()
      client.token = 'test-token'
      client.tokenParsed = { sub: 'user-123', name: 'Test User' }
      client.updateToken = jest.fn().mockResolvedValue(true)

      const stateWithClient = setClient(state, client)

      const parsedToken = await getParsedToken(stateWithClient)

      expect(parsedToken).toEqual({ sub: 'user-123', name: 'Test User' })
      expect(client.updateToken).toHaveBeenCalledWith(60)
    })

    it('should return empty object if token is undefined', async () => {
      const state = createDefaultState()
      const client = new Keycloak()
      client.token = undefined
      client.updateToken = jest.fn().mockResolvedValue(true)

      const stateWithClient = setClient(state, client)

      const parsedToken = await getParsedToken(stateWithClient)

      expect(parsedToken).toEqual({})
    })
  })

  describe('immutability', () => {
    it('should not mutate the original state', () => {
      const original = createDefaultState()
      const originalClient = original.client

      const result = setClient(original, new Keycloak())

      // Verify original is unchanged
      expect(original.client).toBe(originalClient)
      expect(original.client).not.toBe(result.client)
    })
  })
})

