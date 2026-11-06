import { getCookieConsentValue } from 'react-cookie-consent'
import ReactGA from 'react-ga4'

import appConfig from '@/assets/config.json'
import bundledApps from '@/assets/apps.json'

/**
 * Named Google Analytics events for usage reports (#884): networks opened by
 * source, images exported, saves to NDEx, apps run.
 *
 * Params carry categories only. Never put a network UUID or name, a file
 * name, a user id or email, or a service URL in one: a private network's UUID
 * or a lab's server URL would reach Google. GA's automatic page fields would
 * carry the UUIDs too, so `trackEvent` replaces them (`eventPageContext`).
 */
export type AnalyticsEvent =
  | {
      name: 'network_open'
      params: {
        source: 'ndex_dialog' | 'ndex_link' | 'file' | 'url_import' | 'demo'
        format: 'cx2' | 'sif' | 'table'
      }
    }
  | { name: 'image_export'; params: { format: 'png' | 'svg' | 'pdf' } }
  | {
      name: 'ndex_save'
      params: { mode: 'overwrite' | 'first_upload' | 'copy' }
    }
  | {
      name: 'app_run'
      params: { app_type: 'plugin' | 'service'; app_id: string }
    }

type EventName = AnalyticsEvent['name']
type ParamsOf<N extends EventName> = Extract<
  AnalyticsEvent,
  { name: N }
>['params']

/** The cookie the banner writes; react-cookie-consent stores "true" on Accept. */
export const COOKIE_CONSENT_NAME = 'cytoscapeWebCookieConsent'

/** Events sent before GA has started. Boot can open networks well before. */
const MAX_PENDING = 50
let pending: AnalyticsEvent[] = []

/** True once the visitor clicked Accept on the cookie banner. */
export const hasAnalyticsConsent = (): boolean =>
  getCookieConsentValue(COOKIE_CONSENT_NAME) === 'true'

/**
 * Overrides for the page fields GA attaches to every hit. The real URL holds
 * the workspace and network UUIDs (`/<workspaceId>/networks/<networkId>`)
 * and can hold `?import=` URLs; the referrer can be an NDEx network page. An
 * event carries the app's base URL and the referrer's origin instead.
 */
export const eventPageContext = (): {
  page_location: string
  page_referrer: string
  page_title: string
} => {
  let referrerOrigin = ''
  try {
    referrerOrigin =
      document.referrer === '' ? '' : new URL(document.referrer).origin
  } catch {
    // An unparseable referrer is dropped.
  }
  return {
    page_location: `${window.location.origin}${import.meta.env.BASE_URL}`,
    page_referrer: referrerOrigin,
    page_title: 'Cytoscape Web',
  }
}

/**
 * Send one named event. A no-op unless a GA ID is configured and the user
 * accepted cookies, so declining or ignoring the banner sends no events.
 * Every reported count is therefore a lower bound.
 *
 * Before GA starts — it initializes on idle after the first render — the
 * event is held and sent by `flushPendingEvents`.
 */
export const trackEvent = <N extends EventName>(
  name: N,
  params: ParamsOf<N>,
): void => {
  if (appConfig.googleAnalyticsId === '' || !hasAnalyticsConsent()) {
    return
  }
  if (!ReactGA.isInitialized) {
    if (pending.length < MAX_PENDING) {
      pending.push({ name, params } as AnalyticsEvent)
    }
    return
  }
  ReactGA.event(name, { ...params, ...eventPageContext() })
}

/** Send the events held while GA was starting. Called once GA is up. */
export const flushPendingEvents = (): void => {
  if (!ReactGA.isInitialized) {
    return
  }
  const held = pending
  pending = []
  held.forEach((event) => trackEvent(event.name, event.params))
}

/** Clears held events between tests. */
export const resetAnalyticsForTests = (): void => {
  pending = []
}

const BUNDLED_APP_IDS: readonly string[] = bundledApps.map((app) => app.id)

/**
 * The `app_id` for a plugin app: its id when the bundled catalog
 * (`src/assets/apps.json`) lists it, else `custom`. Not the stored
 * `AppSource`: an app from a user-set manifest also persists as `manifest`
 * (see `installGate.ts`), and its name can be private.
 */
export const catalogAppId = (
  appId: string,
  catalogIds: readonly string[] = BUNDLED_APP_IDS,
): string => (catalogIds.includes(appId) ? appId : 'custom')

/**
 * The `app_id` for a service app: the last path segment of a deployment
 * default (`config.defaultServices`), else `custom`. A user-added server URL
 * can be private, so it never leaves the browser.
 */
export const catalogServiceId = (
  url: string,
  defaultServices: readonly string[] = appConfig.defaultServices,
): string => {
  if (!defaultServices.includes(url)) {
    return 'custom'
  }
  return new URL(url).pathname.split('/').filter(Boolean).pop() ?? 'custom'
}
