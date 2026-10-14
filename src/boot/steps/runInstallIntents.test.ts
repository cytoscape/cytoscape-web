import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMessageStore } from '@/data/hooks/stores/MessageStore'
import { AppType } from '@/models/AppModel/AppType'

import type { AppShellBootContext } from './appShellBootContext'
import { runInstallIntents } from './runInstallIntents'

/**
 * The `?installApp=` deep link is the path the App SDK's dev server prints, so
 * it is the one an app developer meets first. These tests cover the trust
 * decision it makes about a localhost URL — the rest of the step is exercised
 * elsewhere.
 */

const DEV1 = 'https://dev1.ndexbio.org'
const MANIFEST_URL = 'http://localhost:6000/cyweb-app.json'
const ALLOWED = ['https://apps.cytoscape.org']

const manifest = [
  {
    id: 'devapp',
    name: 'Dev App',
    url: 'http://localhost:6000/remoteEntry.js',
    version: '1.0.0',
    author: 'A developer',
  },
]

const originalLocation = window.location

/** The served origin decides whether the opt-in applies, so it is the input. */
const serveFrom = (origin: string): void => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { origin, hostname: new URL(origin).hostname },
  })
}

const context = (allowsLocalhostAppsOn?: string): AppShellBootContext =>
  ({
    search: new URLSearchParams({ installApp: MANIFEST_URL }),
    appInstallAllowedOrigins: ALLOWED,
    allowsLocalhostAppsOn,
  }) as unknown as AppShellBootContext

describe('runInstallIntents — localhost apps', () => {
  beforeEach(() => {
    useMessageStore.setState({ messages: [] })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => manifest })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    })
  })

  it('resolves a localhost app when this deployment opted in', async () => {
    serveFrom(DEV1)

    const { pendingAppInstalls } = await runInstallIntents(context(DEV1))

    expect(pendingAppInstalls).toHaveLength(1)
    expect(pendingAppInstalls[0].type).toBe(AppType.Client)
  })

  // Production's behaviour, and the reason the opt-in is a field rather than a
  // build flag: the same binary, told nothing, refuses.
  it('refuses one when no opt-in is configured', async () => {
    serveFrom('https://web.cytoscape.org')

    const { pendingAppInstalls } = await runInstallIntents(context())

    expect(pendingAppInstalls).toHaveLength(0)
    const { messages } = useMessageStore.getState()
    expect(messages[messages.length - 1].message).toContain(
      'not from an allowed origin',
    )
  })

  // D-2 on the deep-link path: the committed dev1 value reaching production.
  it('refuses when the opt-in names a different deployment', async () => {
    serveFrom('https://web.cytoscape.org')

    const { pendingAppInstalls } = await runInstallIntents(context(DEV1))

    expect(pendingAppInstalls).toHaveLength(0)
  })
})
