// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { appInstallMessage, appInstallPreview } from './appInstallMessage'

describe('appInstallPreview', () => {
  it('describes an update without versions in general terms', () => {
    expect(appInstallPreview({ kind: 'update' })).toBe(
      'Replaces the installed version',
    )
    expect(appInstallPreview({ kind: 'update', to: '2.0.0' })).toBe(
      'Replaces the installed version',
    )
  })

  it('says an unversioned app is already installed', () => {
    expect(appInstallPreview({ kind: 'same' })).toBe('Already installed')
  })

  it('has nothing to say about an app that is not installed', () => {
    expect(appInstallPreview({ kind: 'new' })).toBeUndefined()
  })
})

describe('appInstallMessage', () => {
  it('says a new app was added', () => {
    expect(appInstallMessage('NetworkAnalyzer', { kind: 'new' })).toBe(
      'Added NetworkAnalyzer',
    )
  })

  it('names the version an update installed', () => {
    expect(
      appInstallMessage('NetworkAnalyzer', {
        kind: 'update',
        from: '1.0.0',
        to: '1.1.0',
      }),
    ).toBe('Updated NetworkAnalyzer to 1.1.0')
    expect(appInstallMessage('NetworkAnalyzer', { kind: 'update' })).toBe(
      'Updated NetworkAnalyzer',
    )
  })

  it('says which version was kept when the offered one is older', () => {
    expect(
      appInstallMessage('NetworkAnalyzer', {
        kind: 'older',
        installed: '1.1.0',
        offered: '1.0.0',
      }),
    ).toBe(
      'NetworkAnalyzer 1.1.0 is already installed; kept it instead of 1.0.0',
    )
  })

  it('says the same version is already installed', () => {
    expect(
      appInstallMessage('NetworkAnalyzer', { kind: 'same', version: '1.0.0' }),
    ).toBe('NetworkAnalyzer 1.0.0 is already installed')
    expect(appInstallMessage('NetworkAnalyzer', { kind: 'same' })).toBe(
      'NetworkAnalyzer is already installed',
    )
  })

  it('has nothing to add for a rejected install, which reported itself', () => {
    expect(
      appInstallMessage('NetworkAnalyzer', { kind: 'rejected' }),
    ).toBeUndefined()
  })
})
