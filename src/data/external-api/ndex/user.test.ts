// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getNdexClient } from './client'
import { fetchNdexUserName } from './user'

vi.mock('./client', () => ({
  getNdexClient: vi.fn(),
}))

describe('fetchNdexUserName', () => {
  const getCurrentUser = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getNdexClient as any).mockReturnValue({ user: { getCurrentUser } })
  })

  it('returns the userName NDEx reports for the signed-in user', async () => {
    getCurrentUser.mockResolvedValue({ externalId: 'u-1', userName: 'dfong' })

    await expect(fetchNdexUserName('token', 'dev1.ndexbio.org')).resolves.toBe(
      'dfong',
    )
    expect(getNdexClient).toHaveBeenCalledWith('token', 'dev1.ndexbio.org')
  })
})
