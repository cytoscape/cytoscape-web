import ReactGA from 'react-ga4'
import appConfig from '../assets/config.json'

export const initializeGoogleAnalytics = (): void => {
  const { googleAnalyticsId } = appConfig
  if (googleAnalyticsId !== '') {
    ReactGA.initialize(googleAnalyticsId)
  }
}
