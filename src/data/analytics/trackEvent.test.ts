import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ga: { isInitialized: false, event: vi.fn() },
  consent: undefined as string | undefined,
  gaId: 'G-TEST',
}))

vi.mock('react-ga4', () => ({ default: mocks.ga }))
vi.mock('react-cookie-consent', () => ({
  getCookieConsentValue: () => mocks.consent,
}))
vi.mock('@/assets/config.json', () => ({
  default: {
    get googleAnalyticsId() {
      return mocks.gaId
    },
  },
}))

import {
  catalogAppId,
  catalogServiceId,
  eventPageContext,
  flushPendingEvents,
  resetAnalyticsForTests,
  trackEvent,
} from './trackEvent'

/** The page fields every event carries in place of GA's automatic ones. */
const PAGE = {
  page_location: `${window.location.origin}/`,
  page_referrer: '',
  page_title: 'Cytoscape Web',
}

describe('trackEvent', () => {
  beforeEach(() => {
    mocks.ga.isInitialized = false
    mocks.ga.event.mockReset()
    mocks.consent = 'true'
    mocks.gaId = 'G-TEST'
    resetAnalyticsForTests()
  })

  it('sends the event when GA is running and cookies were accepted', () => {
    mocks.ga.isInitialized = true

    trackEvent('image_export', { format: 'png' })

    expect(mocks.ga.event).toHaveBeenCalledWith('image_export', {
      format: 'png',
      ...PAGE,
    })
  })

  // GA attaches page_location to every hit, and the app's URL is
  // /<workspaceId>/networks/<networkId>?import=… (Copilot review on #910).
  it('replaces the page fields, so no UUID or query reaches GA', () => {
    mocks.ga.isInitialized = true
    window.history.pushState(
      {},
      '',
      '/1f0e-workspace/networks/9a8b-network?import=https://lab.internal/x.cx2',
    )
    Object.defineProperty(document, 'referrer', {
      value: 'https://www.ndexbio.org/viewer/networks/9a8b-network',
      configurable: true,
    })

    trackEvent('image_export', { format: 'png' })

    const sent = JSON.stringify(mocks.ga.event.mock.calls)
    expect(sent).not.toContain('workspace')
    expect(sent).not.toContain('network?')
    expect(sent).not.toContain('9a8b')
    expect(sent).not.toContain('lab.internal')
    expect(eventPageContext()).toEqual({
      ...PAGE,
      page_referrer: 'https://www.ndexbio.org',
    })

    window.history.pushState({}, '', '/')
    Object.defineProperty(document, 'referrer', {
      value: '',
      configurable: true,
    })
  })

  it('sends nothing until the user accepts cookies', () => {
    mocks.ga.isInitialized = true

    mocks.consent = undefined
    trackEvent('image_export', { format: 'png' })
    mocks.consent = 'false'
    trackEvent('image_export', { format: 'svg' })

    expect(mocks.ga.event).not.toHaveBeenCalled()
  })

  it('sends nothing when no GA ID is configured', () => {
    mocks.gaId = ''

    trackEvent('ndex_save', { mode: 'copy' })
    flushPendingEvents()

    expect(mocks.ga.event).not.toHaveBeenCalled()
  })

  // Deep links and ?import= open networks during boot, before GA starts on
  // idle. Those events are held, not lost.
  it('holds events from before GA starts and sends them once it has', () => {
    trackEvent('network_open', { source: 'ndex_link', format: 'cx2' })
    trackEvent('network_open', { source: 'url_import', format: 'cx2' })
    expect(mocks.ga.event).not.toHaveBeenCalled()

    mocks.ga.isInitialized = true
    flushPendingEvents()

    expect(mocks.ga.event.mock.calls).toEqual([
      ['network_open', { source: 'ndex_link', format: 'cx2', ...PAGE }],
      ['network_open', { source: 'url_import', format: 'cx2', ...PAGE }],
    ])

    flushPendingEvents()
    expect(mocks.ga.event).toHaveBeenCalledTimes(2)
  })

  it('caps the held events', () => {
    for (let i = 0; i < 100; i++) {
      trackEvent('image_export', { format: 'png' })
    }
    mocks.ga.isInitialized = true
    flushPendingEvents()

    expect(mocks.ga.event).toHaveBeenCalledTimes(50)
  })
})

describe('catalogServiceId', () => {
  const defaults = [
    'https://cd.ndexbio.org/cy/cytocontainer/v1/iqueryenrichment',
  ]

  it('names a default service by its last path segment', () => {
    expect(
      catalogServiceId(
        'https://cd.ndexbio.org/cy/cytocontainer/v1/iqueryenrichment',
        defaults,
      ),
    ).toBe('iqueryenrichment')
  })

  // A user-added server URL can be private.
  it('sends "custom" for a service the user added', () => {
    expect(catalogServiceId('https://lab.internal/v1/mytool', defaults)).toBe(
      'custom',
    )
  })
})

describe('catalogAppId', () => {
  const catalog = ['hello', 'networkStatistics']

  it('names an app from the bundled catalog by its id', () => {
    expect(catalogAppId('hello', catalog)).toBe('hello')
  })

  // An app from a user-set manifest or a URL can carry a private name.
  it('sends "custom" for any other app', () => {
    expect(catalogAppId('my-lab-app', catalog)).toBe('custom')
  })
})
