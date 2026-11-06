// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ga: { isInitialized: false, initialize: vi.fn() },
  consent: undefined as string | undefined,
  gaId: 'G-TEST',
  flushPendingEvents: vi.fn(),
}))

vi.mock('react-ga4', () => ({ default: mocks.ga }))
vi.mock('@/assets/config.json', () => ({
  default: {
    get googleAnalyticsId() {
      return mocks.gaId
    },
  },
}))
vi.mock('@/data/analytics/trackEvent', () => ({
  hasAnalyticsConsent: () => mocks.consent === 'true',
  flushPendingEvents: mocks.flushPendingEvents,
}))

import { initializeGoogleAnalytics } from './googleAnalytics'

// GA sets cookies and sends page views as soon as it starts (#855).
describe('initializeGoogleAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.ga.isInitialized = false
    mocks.ga.initialize.mockImplementation(() => {
      mocks.ga.isInitialized = true
    })
    mocks.consent = 'true'
    mocks.gaId = 'G-TEST'
  })

  it('starts GA and sends held events once cookies were accepted', () => {
    initializeGoogleAnalytics()

    expect(mocks.ga.initialize).toHaveBeenCalledWith('G-TEST')
    expect(mocks.flushPendingEvents).toHaveBeenCalledTimes(1)
  })

  it('does not start GA before the visitor answers the banner', () => {
    mocks.consent = undefined

    initializeGoogleAnalytics()

    expect(mocks.ga.initialize).not.toHaveBeenCalled()
  })

  it('does not start GA after the visitor declined', () => {
    mocks.consent = 'false'

    initializeGoogleAnalytics()

    expect(mocks.ga.initialize).not.toHaveBeenCalled()
  })

  it('does not start GA without a configured ID', () => {
    mocks.gaId = ''

    initializeGoogleAnalytics()

    expect(mocks.ga.initialize).not.toHaveBeenCalled()
  })

  // Boot calls it on idle and the banner calls it on Accept.
  it('starts GA only once', () => {
    initializeGoogleAnalytics()
    initializeGoogleAnalytics()

    expect(mocks.ga.initialize).toHaveBeenCalledTimes(1)
  })
})
