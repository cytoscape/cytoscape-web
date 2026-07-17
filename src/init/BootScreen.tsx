import cytoscapeLogo from '../assets/cytoscape.svg'
import { BOOT_SCREEN_CSS } from './bootSplash'

export declare const REACT_APP_VERSION: string
export declare const REACT_APP_BUILD_TIME: string

/**
 * React boot screen shown while the app chunk streams in. Renders the same
 * markup/CSS as the framework-free splash it replaces (see bootSplash.ts),
 * so the takeover is invisible.
 *
 * Deliberately dependency-free (no MUI): this component paints before the
 * app chunks finish loading, so importing @mui/material here would put the
 * entire MUI + Emotion bundle on the first-paint critical path.
 */
export const BootScreen = ({
  loadingMessage,
}: {
  loadingMessage: string
}) => {
  const version =
    typeof REACT_APP_VERSION !== 'undefined' ? REACT_APP_VERSION : 'Unknown'

  let buildTime =
    typeof REACT_APP_BUILD_TIME !== 'undefined'
      ? REACT_APP_BUILD_TIME
      : 'Unknown'

  if (buildTime !== 'Unknown') {
    try {
      buildTime = new Date(buildTime).toLocaleString()
    } catch {
      // Keep raw string if parse fails
    }
  }

  return (
    <div className="boot-screen">
      <style>{BOOT_SCREEN_CSS}</style>
      <div className="boot-screen-main">
        <div className="boot-screen-logo">
          <img src={cytoscapeLogo} alt="Cytoscape Logo" />
        </div>
        <div className="boot-screen-text">
          <h1>Cytoscape Web</h1>
          <div className="boot-screen-version">
            <h2>Version {version}</h2>
            <p className="boot-screen-built">Built on: {buildTime}</p>
          </div>
          <div className="boot-screen-message">
            <p>{loadingMessage}</p>
            <div className="boot-screen-spinner" />
          </div>
        </div>
      </div>
      <p className="boot-screen-footer">Initial loading may take some time</p>
    </div>
  )
}
