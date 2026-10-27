import ReactGA from 'react-ga4'

import appConfig from '@/assets/config.json'
import { flushPendingEvents } from '@/data/analytics/trackEvent'

export const initializeGoogleAnalytics = (): void => {
  const { googleAnalyticsId } = appConfig
  if (googleAnalyticsId !== '') {
    ReactGA.initialize(googleAnalyticsId)
    // Networks opened during boot (deep links, ?import=) were tracked before
    // GA started.
    flushPendingEvents()
  }
}
