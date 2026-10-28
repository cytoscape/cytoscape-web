import ReactGA from 'react-ga4'

import appConfig from '@/assets/config.json'
import {
  flushPendingEvents,
  hasAnalyticsConsent,
} from '@/data/analytics/trackEvent'

/**
 * Starts Google Analytics, only for a visitor who accepted cookies (#855):
 * GA sets its own cookies and sends page views as soon as it starts. Boot
 * calls this on idle, and the cookie banner calls it on Accept. Safe to call
 * more than once.
 */
export const initializeGoogleAnalytics = (): void => {
  const { googleAnalyticsId } = appConfig
  if (
    googleAnalyticsId === '' ||
    !hasAnalyticsConsent() ||
    ReactGA.isInitialized
  ) {
    return
  }
  ReactGA.initialize(googleAnalyticsId)
  // Networks opened during boot (deep links, ?import=) were tracked before
  // GA started.
  flushPendingEvents()
}
