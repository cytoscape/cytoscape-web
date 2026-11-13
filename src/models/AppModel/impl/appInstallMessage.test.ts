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

  // Compatibility can make an install replace a newer version with an older
  // one (the installed one cannot run here); "Updates … to" would misstate it.
  it('says an older version replaces one that cannot run here', () => {
    expect(
      appInstallPreview({ kind: 'update', from: '2.0.0', to: '1.0.0' }),
    ).toBe(
      'Replaces the installed version 2.0.0, which cannot run on this Cytoscape Web, with 1.0.0',
    )
  })

  it('says an unversioned app is already installed', () => {
    expect(appInstallPreview({ kind: 'same' })).toBe('Already installed')
  })

  it('has nothing to say about an app that is not installed', () => {
    expect(appInstallPreview({ kind: 'new' })).toBeUndefined()
  })

  it('says an offered version this host cannot run keeps the installed one', () => {
    expect(
      appInstallPreview({
        kind: 'incompatible',
        offered: '2.0.0',
        range: '>=999.0.0',
        kept: '1.0.0',
      }),
    ).toBe(
      'Version 2.0.0 needs Cytoscape Web >=999.0.0; the installed 1.0.0 is kept',
    )
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

  it('says an older version replaced one that cannot run here', () => {
    expect(
      appInstallMessage('NetworkAnalyzer', {
        kind: 'update',
        from: '2.0.0',
        to: '1.0.0',
      }),
    ).toBe(
      'Replaced NetworkAnalyzer 2.0.0, which cannot run on this Cytoscape Web, with 1.0.0',
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

  it('says which version was kept when the offered one cannot run here', () => {
    expect(
      appInstallMessage('NetworkAnalyzer', {
        kind: 'incompatible',
        offered: '2.0.0',
        range: '>=999.0.0',
        kept: '1.0.0',
      }),
    ).toBe('NetworkAnalyzer 2.0.0 needs Cytoscape Web >=999.0.0; kept 1.0.0')
  })

  it('has nothing to add for a rejected install, which reported itself', () => {
    expect(
      appInstallMessage('NetworkAnalyzer', { kind: 'rejected' }),
    ).toBeUndefined()
  })
})
