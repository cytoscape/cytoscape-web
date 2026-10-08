import { describe, expect, it } from 'vitest'

import { parseUserInfoFromErrorMessage } from './keycloak'

describe('parseUserInfoFromErrorMessage', () => {
  it('extracts the user name and email from an NDEx verification error', () => {
    const message =
      'Error: NDEx user account jdoe <jdoe@example.org> is not verified.'

    expect(parseUserInfoFromErrorMessage(message)).toEqual({
      userName: 'jdoe',
      userEmail: 'jdoe@example.org',
    })
  })

  it('supports dots in user names and email locals', () => {
    const message = 'NDEx user account jane.doe <jane.doe@sub.example.org>'

    expect(parseUserInfoFromErrorMessage(message)).toEqual({
      userName: 'jane.doe',
      userEmail: 'jane.doe@sub.example.org',
    })
  })

  it('returns null when the message has no account information', () => {
    expect(parseUserInfoFromErrorMessage('Some other error')).toBeNull()
    expect(parseUserInfoFromErrorMessage('')).toBeNull()
    // Missing the angle-bracketed email
    expect(parseUserInfoFromErrorMessage('NDEx user account jdoe')).toBeNull()
  })
})
