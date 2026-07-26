// Single source of truth for the boot shell's markup and CSS.
//
// The boot shell is the *only* visual the user sees between navigation and an
// interactive app. It is shaped like the real app (toolbar strip, left panel,
// canvas, bottom tab strip) with the Cytoscape identity block centered where
// the network canvas will be, so every boot transition resolves a region in
// place instead of swapping in an unrelated full-screen layout.
//
// Both renderers consume the strings below — `showBootShell()` (plain DOM,
// runs in the tiny pre-React entry chunk) and `BootShell.tsx` (React, used as
// the Suspense fallbacks). They are guaranteed identical rather than
// "kept in sync by hand", which is what makes the handoff flash-free.
//
// Deliberately dependency-free: this paints before react-dom and the ~700kB
// MUI shared chunk arrive, so a single import here would put that download
// back on the first-paint critical path.

// REACT_APP_VERSION / REACT_APP_BUILD_TIME are Vite `define` constants,
// declared globally in src/custom.d.ts.

export const BOOT_SHELL_TESTID = 'boot-shell'

/** `full` includes the toolbar strip; `content` sits below the real toolbar. */
export type BootShellRegion = 'full' | 'content'

export interface BootShellError {
  title: string
  message: string
  detail?: string
}

export interface BootShellOptions {
  region?: BootShellRegion
  message?: string
  error?: BootShellError
}

export const DEFAULT_BOOT_MESSAGE = 'Loading application...'

export const BOOT_SHELL_CSS = `
.boot-shell {
  --boot-shell-logo-size: 120px;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: #ffffff;
  color: #495057;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
    'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
}
.boot-shell,
.boot-shell *,
.boot-shell *::before,
.boot-shell *::after {
  box-sizing: border-box;
}
.boot-shell h1,
.boot-shell h2,
.boot-shell h3,
.boot-shell p {
  margin: 0;
}
.boot-shell-block {
  border-radius: 4px;
  background: linear-gradient(90deg, #e9eaeb 25%, #f4f5f6 50%, #e9eaeb 75%);
  background-size: 200% 100%;
  animation: boot-shell-shimmer 1.6s ease-in-out infinite;
}
.boot-shell-block-dark {
  background: linear-gradient(90deg, #37393b 25%, #46484a 50%, #37393b 75%);
  background-size: 200% 100%;
}
@keyframes boot-shell-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
.boot-shell-toolbar {
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 16px;
  background-color: #212121;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.boot-shell-toolbar-logo {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}
.boot-shell-toolbar-menu {
  width: 44px;
  height: 12px;
}
.boot-shell-toolbar-spacer {
  flex-grow: 1;
}
.boot-shell-toolbar-search {
  width: 320px;
  height: 30px;
  border-radius: 15px;
}
.boot-shell-toolbar-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-left: 6px;
}
.boot-shell-body {
  flex-grow: 1;
  display: flex;
  min-height: 0;
}
.boot-shell-left {
  width: 450px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e0e0e0;
}
.boot-shell-left-tabs {
  height: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 16px;
  background-color: #eeeeee;
  border-bottom: 1px solid #e0e0e0;
}
.boot-shell-left-tab {
  width: 90px;
  height: 12px;
}
.boot-shell-left-row {
  height: 14px;
  margin: 14px 16px 0 16px;
}
.boot-shell-main {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.boot-shell-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  max-width: 100%;
}
.boot-shell-logo {
  width: var(--boot-shell-logo-size);
  height: var(--boot-shell-logo-size);
  flex-shrink: 0;
}
.boot-shell-logo svg {
  display: block;
  width: 100%;
  height: 100%;
}
.boot-shell-card h1 {
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: 2px;
}
.boot-shell-version h2 {
  font-size: 1.15rem;
  font-weight: 500;
  color: #ea9123;
}
.boot-shell-built {
  font-size: 0.8rem;
  font-weight: 300;
  color: #666666;
  opacity: 0.8;
}
.boot-shell-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 10px;
  min-height: 1.8rem;
}
.boot-shell-status p {
  font-size: 1rem;
  opacity: 0.9;
}
.boot-shell-spinner {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2.5px solid rgba(73, 80, 87, 0.2);
  border-top-color: #495057;
  animation: boot-shell-spin 0.8s linear infinite;
}
@keyframes boot-shell-spin {
  to {
    transform: rotate(360deg);
  }
}
.boot-shell-footer {
  margin-top: 1.5rem;
  font-size: 0.9rem;
  font-style: italic;
  color: #444444;
  opacity: 0.9;
}
.boot-shell-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  max-width: 520px;
}
.boot-shell-error-icon {
  width: 32px;
  height: 32px;
}
.boot-shell-error-icon svg {
  display: block;
  width: 100%;
  height: 100%;
}
.boot-shell-error h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #c62828;
}
.boot-shell-error p {
  font-size: 0.95rem;
  line-height: 1.5;
}
.boot-shell-error-detail {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.8rem;
  color: #666666;
  word-break: break-word;
}
.boot-shell-bottom {
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 0 24px;
  background-color: #eeeeee;
  border-top: 1px solid #e0e0e0;
}
.boot-shell-bottom-tab {
  width: 60px;
  height: 12px;
}
@media (min-width: 900px) {
  .boot-shell {
    --boot-shell-logo-size: 160px;
  }
  .boot-shell-card h1 {
    font-size: 2.25rem;
  }
  .boot-shell-version h2 {
    font-size: 1.4rem;
  }
}
@media (max-width: 899px) {
  .boot-shell-left {
    display: none;
  }
  .boot-shell-toolbar-search {
    width: 160px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .boot-shell-block,
  .boot-shell-spinner {
    animation: none;
  }
}
`

// Inlined copy of src/assets/cytoscape.svg (1.8kB) so the shell needs no
// asset request — an <img src> here would fetch at exactly the moment the
// React shell takes over from the plain-DOM one, producing a logo flash.
const CYTOSCAPE_LOGO_SVG = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.6375 7.89337C14.587 8.38962 14.4428 8.86975 14.211 9.31084L17.9715 13.1506C18.5094 12.8914 19.0947 12.7473 19.6945 12.7265L21.2605 7.56658C20.8605 7.27001 20.52 6.89945 20.2585 6.47577L14.6375 7.89337ZM14.0107 5.34079L19.7123 3.90284C19.9682 1.98591 21.6113 0.51532 23.5871 0.51532C25.7458 0.51532 27.4967 2.26636 27.4967 4.42495C27.4967 6.52991 25.8317 8.24716 23.7475 8.33126L22.2025 13.4216C23.4207 14.2131 24.1716 15.5717 24.1716 17.0491C24.1716 18.2891 23.6434 19.4541 22.7334 20.2696L24.4249 23.6459C24.6061 23.6202 24.7894 23.6075 24.9728 23.6075C27.1316 23.6075 28.8825 25.3585 28.8825 27.5172C28.8825 29.6756 27.1316 31.4267 24.9728 31.4267C22.8141 31.4267 21.0632 29.6756 21.0632 27.5172C21.0632 26.5172 21.4427 25.5679 22.117 24.8472L20.3616 21.3436C20.1908 21.364 20.0186 21.3743 19.8463 21.3743C18.9707 21.3743 18.1255 21.1118 17.4101 20.6227L15.4226 22.3731C15.4361 22.4759 15.4427 22.5796 15.4427 22.6838C15.4427 24.0008 14.3746 25.0692 13.0574 25.0692C11.7403 25.0692 10.672 24.0008 10.672 22.6838C10.672 21.3665 11.7403 20.2981 13.0574 20.2981C13.2848 20.2981 13.5098 20.3304 13.7265 20.3935L15.7969 18.5704C15.6916 18.29 15.6159 17.9995 15.5709 17.7033L10.6353 17.0385C9.95997 18.2935 8.64337 19.0955 7.19197 19.0955C5.03325 19.0955 3.28247 17.3445 3.28247 15.186C3.28247 13.0274 5.03325 11.2767 7.19197 11.2767C9.09124 11.2767 10.695 12.6388 11.0349 14.4651L15.9696 15.13C16.0023 15.0638 16.037 14.9984 16.0733 14.9338L12.3026 11.0833C11.8133 11.2956 11.2855 11.405 10.7481 11.405C8.58948 11.405 6.83857 9.65414 6.83857 7.49554C6.83857 5.33695 8.58948 3.58604 10.7481 3.58604C12.073 3.58591 13.2928 4.2542 14.0107 5.34079Z" fill="#EA9123"/></svg>`

const ERROR_ICON_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#c62828" d="M12 2 1 21h22L12 2Zm0 5.5 7.5 12.9h-15L12 7.5ZM11 11v4.5h2V11h-2Zm0 5.75v2h2v-2h-2Z"/></svg>`

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const repeat = (count: number, html: string): string => html.repeat(count)

export const bootShellVersion = (): string =>
  typeof REACT_APP_VERSION !== 'undefined' ? REACT_APP_VERSION : 'Unknown'

export const bootShellBuildTime = (): string => {
  const raw =
    typeof REACT_APP_BUILD_TIME !== 'undefined' ? REACT_APP_BUILD_TIME : 'Unknown'
  if (raw === 'Unknown') {
    return raw
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleString()
}

export const bootShellClassName = (region: BootShellRegion): string =>
  `boot-shell boot-shell-${region}`

export const BOOT_SHELL_STYLE_ID = 'cyweb-boot-shell-style'

/**
 * Installs the shell stylesheet in <head>, once.
 *
 * It used to live inside the shell's own markup, which meant every repaint
 * re-inserted the whole stylesheet and forced a style recalc. Keeping it out
 * of the shell subtree also keeps the subtree cheap to leave alone.
 */
export const ensureBootShellStyles = (): void => {
  if (
    typeof document === 'undefined' ||
    document.getElementById(BOOT_SHELL_STYLE_ID) !== null
  ) {
    return
  }

  const style = document.createElement('style')
  style.id = BOOT_SHELL_STYLE_ID
  style.textContent = BOOT_SHELL_CSS
  document.head.appendChild(style)
}

const STATUS_MESSAGE_SELECTOR = '.boot-shell-status p'

/**
 * Writes the status line into an already-rendered shell.
 *
 * The message is applied imperatively, not baked into the markup, so that
 * changing it does not change the HTML string. That matters because the React
 * renderer feeds that string to dangerouslySetInnerHTML: if the string moved,
 * React would replace the entire subtree, recreating every shimmer block and
 * the spinner and restarting their CSS animations from frame zero — three
 * times over a normal boot. Same helper drives both renderers, so they stay
 * byte-identical.
 */
export const applyBootShellMessage = (
  shell: Element,
  message: string,
): void => {
  const target = shell.querySelector(STATUS_MESSAGE_SELECTOR)
  if (target !== null) {
    target.textContent = message
  }
}

const statusHtml = (): string => `
    <div class="boot-shell-status">
      <div class="boot-shell-spinner"></div>
      <p></p>
    </div>
    <p class="boot-shell-footer">Initial loading may take some time</p>`

// Terminal state: no spinner and no "may take some time" — both actively
// mislead when nothing more is coming. The version and build time stay, since
// that is precisely what someone diagnosing this needs to read off the screen.
const errorHtml = (error: BootShellError): string => `
    <div class="boot-shell-error" role="alert">
      <div class="boot-shell-error-icon">${ERROR_ICON_SVG}</div>
      <h3>${escapeHtml(error.title)}</h3>
      <p>${escapeHtml(error.message)}</p>${
        error.detail === undefined
          ? ''
          : `
      <p class="boot-shell-error-detail">${escapeHtml(error.detail)}</p>`
      }
    </div>`

/**
 * Inner HTML of the boot shell container. Both renderers supply the container
 * element itself (with `bootShellClassName` and `BOOT_SHELL_TESTID`), so the
 * resulting DOM is identical whichever one produced it.
 *
 * Deliberately does NOT take the status message — see applyBootShellMessage.
 * The result depends only on `region` and whether the boot has failed, both of
 * which change at most once, so the subtree is built once and then left alone.
 */
export const bootShellInnerHtml = (
  options: Omit<BootShellOptions, 'message'> = {},
): string => {
  const { region = 'full', error } = options

  const toolbar =
    region === 'full'
      ? `
  <div class="boot-shell-toolbar">
    <div class="boot-shell-block boot-shell-block-dark boot-shell-toolbar-logo"></div>
    ${repeat(
      7,
      '<div class="boot-shell-block boot-shell-block-dark boot-shell-toolbar-menu"></div>',
    )}
    <div class="boot-shell-toolbar-spacer"></div>
    <div class="boot-shell-block boot-shell-block-dark boot-shell-toolbar-search"></div>
    <div class="boot-shell-block boot-shell-block-dark boot-shell-toolbar-avatar"></div>
  </div>`
      : ''

  return `${toolbar}
  <div class="boot-shell-body">
    <div class="boot-shell-left">
      <div class="boot-shell-left-tabs">
        ${repeat(
          2,
          '<div class="boot-shell-block boot-shell-left-tab"></div>',
        )}
      </div>
      ${repeat(3, '<div class="boot-shell-block boot-shell-left-row"></div>')}
    </div>
    <div class="boot-shell-main">
      <div class="boot-shell-card">
        <div class="boot-shell-logo">${CYTOSCAPE_LOGO_SVG}</div>
        <h1>Cytoscape Web</h1>
        <div class="boot-shell-version">
          <h2>Version ${escapeHtml(bootShellVersion())}</h2>
          <p class="boot-shell-built">Built on: ${escapeHtml(
            bootShellBuildTime(),
          )}</p>
        </div>${error === undefined ? statusHtml() : errorHtml(error)}
      </div>
    </div>
  </div>
  <div class="boot-shell-bottom">
    ${repeat(3, '<div class="boot-shell-block boot-shell-bottom-tab"></div>')}
  </div>`
}
