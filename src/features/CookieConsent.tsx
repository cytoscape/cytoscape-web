import Cookies from 'js-cookie'
import { CookieConsent } from 'react-cookie-consent'

export const COOKIE_NAME = 'cytoscapeWebCookieConsent'

export const CookieConsentWidget: React.FC = () => {
  const removeAllCookies = () => {
    const allCookies = Cookies.get()
    Object.keys(allCookies).forEach((cookieName) => {
      Cookies.remove(cookieName, { path: '/' })
    })
  }

  return (
    <CookieConsent
      data-testid="cookie-consent"
      location="bottom"
      buttonText="Accept"
      declineButtonText="Decline"
      enableDeclineButton
      setDeclineCookie={false}
      flipButtons
      onDecline={removeAllCookies}
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
      <a
        href="https://github.com/cytoscape/cytoscape-web/blob/development/privacy-policy.md"
        style={{ color: '#e0e0e0' }}
      >
        Learn more
      </a>
    </CookieConsent>
  )
}
