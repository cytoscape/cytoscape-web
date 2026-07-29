import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { closeDb, deleteDb, initializeDb } from '../index'
import { exportApplicationState } from './exportApplicationState'

// Keycloak cannot be constructed in jsdom; give the credential store a stub
vi.mock('keycloak-js', () => {
  return {
    default: class MockKeycloak {
      token?: string
      refreshToken?: string
      idToken?: string
      authenticated = false
    },
  }
})

describe('exportApplicationState', () => {
  beforeEach(async () => {
    await deleteDb()
    await initializeDb()
  })

  afterEach(async () => {
    await closeDb()
  })

  it(
    'produces parseable JSON with metadata, database and stores sections',
    async () => {
      const stateJson = await exportApplicationState()
      const state = JSON.parse(stateJson)

      expect(state.metadata).toBeDefined()
      expect(state.database).toBeDefined()
      expect(state.stores).toBeDefined()
      expect(state.summary).toBeDefined()
    },
    // First call dynamically imports every store module
    10000,
  )

  // REVIEW.md R2-11 (security): the debug export used to serialize the
  // entire CredentialStore — including the Keycloak client, whose enumerable
  // properties contain token/refreshToken/idToken after login — into a JSON
  // file explicitly intended to be shared for debugging.
  it(
    'never includes auth tokens from the credential store (regression: R2-11)',
    async () => {
      const { useCredentialStore } = await import(
        '../../hooks/stores/CredentialStore'
      )
      useCredentialStore.setState({
        client: {
          token: 'SECRET_ACCESS_TOKEN_abc123',
          refreshToken: 'SECRET_REFRESH_TOKEN_xyz789',
          idToken: 'SECRET_ID_TOKEN_qrs456',
          authenticated: true,
        } as any,
      })

      const stateJson = await exportApplicationState()

      expect(stateJson).not.toContain('SECRET_ACCESS_TOKEN_abc123')
      expect(stateJson).not.toContain('SECRET_REFRESH_TOKEN_xyz789')
      expect(stateJson).not.toContain('SECRET_ID_TOKEN_qrs456')
    },
    10000,
  )
})
