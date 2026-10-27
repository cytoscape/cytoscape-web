import Cookies from 'js-cookie'
import { CookieConsent } from 'react-cookie-consent'

import { COOKIE_CONSENT_NAME } from '../data/analytics/trackEvent'
import { MANUAL_ROUTE_SEGMENT } from '../data/db/dbScope'
import { useCrashDataConsent } from '../data/hooks/useCrashDataConsent'

// Defined beside trackEvent, which reads it before sending an event.
export const COOKIE_NAME = COOKIE_CONSENT_NAME

export const CookieConsentWidget: React.FC = () => {
  const {
    consentStatus,
    accept: acceptCrashReports,
    decline: declineCrashReports,
  } = useCrashDataConsent()

  const removeAllCookies = () => {
    const allCookies = Cookies.get()
    Object.keys(allCookies).forEach((cookieName) => {
      Cookies.remove(cookieName, { path: '/' })
    })
  }

  return (
    <CookieConsent
      customContainerAttributes={{ 'data-testid': 'cookie-consent' }}
      customButtonProps={{ 'data-testid': 'cookie-consent-accept-button' }}
      customDeclineButtonProps={{
        'data-testid': 'cookie-consent-decline-button',
      }}
      location="bottom"
      buttonText="Accept"
      declineButtonText="Decline"
      enableDeclineButton
      setDeclineCookie={false}
      flipButtons
      onDecline={removeAllCookies}
      onAccept={() => {
        // Keep crash reporting enabled (opt-out model). Persist "accepted" so we don't
        // treat this as an undecided state forever.
        acceptCrashReports()
      }}
      cookieName={COOKIE_NAME}
      style={{ background: '#4F4F4F' }}
      buttonStyle={{
        backgroundColor: '#0073B0',
        color: '#ffffff',
        fontSize: '13px',
      }}
      declineButtonStyle={{
        color: '#ffffff',
        background: '#6c757d',
        fontSize: '13px',
      }}
      expires={150}
    >
      This site uses cookies to support Cytoscape Web’s network visualization
      tools and improve your experience. By accepting, you consent to our data
      practices.{' '}
      {/* A new tab, so reading the policy never unloads the editor. */}
      <a
        href={`${import.meta.env.BASE_URL}${MANUAL_ROUTE_SEGMENT}/privacy-policy`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#e0e0e0' }}
      >
        Learn more
      </a>
      <span style={{ marginLeft: 12 }}>
        Crash reports are sent automatically to help debug issues.{' '}
        {consentStatus === 'declined' ? (
          <button
            type="button"
            onClick={acceptCrashReports}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: '#e0e0e0',
              textDecoration: 'underline',
              cursor: 'pointer',
              font: 'inherit',
            }}
          >
            Enable crash reports
          </button>
        ) : (
          <button
            type="button"
            onClick={declineCrashReports}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: '#e0e0e0',
              textDecoration: 'underline',
              cursor: 'pointer',
              font: 'inherit',
            }}
          >
            Opt out
          </button>
        )}
        .
      </span>
    </CookieConsent>
  )
}
