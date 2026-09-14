// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { AppLoadFailure } from '../AppLoadFailure'
import {
  appLoadFailureMessage,
  appLoadFailureToast,
} from './appLoadFailureMessage'

describe('appLoadFailureMessage', () => {
  it('carries both ids verbatim for a mis-packaged bundle', () => {
    const message = appLoadFailureMessage({
      code: 'id-mismatch',
      url: 'https://apps-stage.cytoscape.org/web/chrisapp/0.2.0/remoteEntry.js',
      expected: 'chrisapp',
      received: 'chrisApp',
    })

    // The user can fix nothing here; the message has to be reportable to the
    // publisher, which means both ids, case intact.
    expect(message).toContain('"chrisApp"')
    expect(message).toContain('"chrisapp"')
    expect(message).toContain('mis-packaged')
  })

  it('names the URL and the thrown message for a fetch failure', () => {
    const message = appLoadFailureMessage({
      code: 'fetch-failed',
      url: 'https://apps-stage.cytoscape.org/web/nope/remoteEntry.js',
      message: 'HTTP 404',
    })

    expect(message).toContain(
      'https://apps-stage.cytoscape.org/web/nope/remoteEntry.js',
    )
    expect(message).toContain('HTTP 404')
    expect(message).toContain('Reload the page')
  })

  it('names the rejected origin', () => {
    expect(
      appLoadFailureMessage({
        code: 'origin-blocked',
        url: 'https://evil.example.com/remoteEntry.js',
      }),
    ).toContain('https://evil.example.com/remoteEntry.js')
  })

  it('returns non-empty text for every code', () => {
    const failures: AppLoadFailure[] = [
      { code: 'origin-blocked', url: 'https://a/b.js' },
      { code: 'fetch-failed', url: 'https://a/b.js', message: 'x' },
      { code: 'no-app-config', url: 'https://a/b.js' },
      {
        code: 'id-mismatch',
        url: 'https://a/b.js',
        expected: 'a',
        received: 'b',
      },
      { code: 'mount-failed', message: 'x' },
    ]

    for (const failure of failures) {
      expect(appLoadFailureMessage(failure).length).toBeGreaterThan(0)
    }
  })

  it('prefixes the app name for a toast', () => {
    expect(
      appLoadFailureToast('chrisapp app', {
        code: 'mount-failed',
        message: 'boom',
      }),
    ).toBe(
      'Could not load "chrisapp app". The app loaded but failed to start: boom',
    )
  })
})
