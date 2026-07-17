export declare const REACT_APP_VERSION: string

// Shared with BootScreen.tsx so the framework-free splash below and the
// React boot screen that replaces it are pixel-identical — keep in sync
// with the markup structure in both places.
export const BOOT_SCREEN_CSS = `
.boot-screen {
  position: fixed;
  inset: 0;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 99999;
  color: #495057;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
    'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
}
.boot-screen h1,
.boot-screen h2,
.boot-screen p {
  margin: 0;
}
.boot-screen-main {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  max-width: 90%;
  padding: 0 20px;
}
.boot-screen-logo {
  width: 300px;
  height: 300px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
.boot-screen-logo img,
.boot-screen-logo svg {
  width: 100%;
  height: 100%;
}
.boot-screen-text {
  display: flex;
  flex-direction: column;
  text-align: center;
  width: 280px;
}
.boot-screen-text h1 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 15px;
  letter-spacing: 2px;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.boot-screen-version {
  margin-bottom: 20px;
  text-align: center;
}
.boot-screen-version h2 {
  font-size: 1.5rem;
  color: #ea9123;
  height: 2.5rem;
  font-weight: 500;
  margin-bottom: 5px;
}
.boot-screen-built {
  font-size: 0.8rem;
  color: #666666;
  font-weight: 300;
  opacity: 0.8;
}
.boot-screen-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 30px;
  height: 1.8rem;
}
.boot-screen-message p {
  font-size: 1rem;
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}
.boot-screen-spinner {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2.5px solid rgba(73, 80, 87, 0.2);
  border-top-color: #495057;
  animation: boot-screen-spin 0.8s linear infinite;
}
@keyframes boot-screen-spin {
  to {
    transform: rotate(360deg);
  }
}
.boot-screen-footer {
  margin-top: 3rem;
  font-size: 1rem;
  color: #444444;
  opacity: 0.9;
  text-align: center;
  font-style: italic;
}
@media (min-width: 900px) {
  .boot-screen-main {
    flex-direction: row;
    gap: 20px;
  }
  .boot-screen-logo {
    width: 330px;
    height: 330px;
  }
  .boot-screen-text {
    width: 400px;
  }
  .boot-screen-text h1 {
    font-size: 3rem;
    height: 4rem;
  }
  .boot-screen-built {
    font-size: 0.9rem;
  }
  .boot-screen-message {
    height: 2rem;
    margin-bottom: 40px;
  }
  .boot-screen-message p {
    font-size: 1.2rem;
    max-width: 320px;
  }
}
`

// Inlined copy of src/assets/cytoscape.svg (1.8kB) so the splash needs no
// extra asset request.
const CYTOSCAPE_LOGO_SVG = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.6375 7.89337C14.587 8.38962 14.4428 8.86975 14.211 9.31084L17.9715 13.1506C18.5094 12.8914 19.0947 12.7473 19.6945 12.7265L21.2605 7.56658C20.8605 7.27001 20.52 6.89945 20.2585 6.47577L14.6375 7.89337ZM14.0107 5.34079L19.7123 3.90284C19.9682 1.98591 21.6113 0.51532 23.5871 0.51532C25.7458 0.51532 27.4967 2.26636 27.4967 4.42495C27.4967 6.52991 25.8317 8.24716 23.7475 8.33126L22.2025 13.4216C23.4207 14.2131 24.1716 15.5717 24.1716 17.0491C24.1716 18.2891 23.6434 19.4541 22.7334 20.2696L24.4249 23.6459C24.6061 23.6202 24.7894 23.6075 24.9728 23.6075C27.1316 23.6075 28.8825 25.3585 28.8825 27.5172C28.8825 29.6756 27.1316 31.4267 24.9728 31.4267C22.8141 31.4267 21.0632 29.6756 21.0632 27.5172C21.0632 26.5172 21.4427 25.5679 22.117 24.8472L20.3616 21.3436C20.1908 21.364 20.0186 21.3743 19.8463 21.3743C18.9707 21.3743 18.1255 21.1118 17.4101 20.6227L15.4226 22.3731C15.4361 22.4759 15.4427 22.5796 15.4427 22.6838C15.4427 24.0008 14.3746 25.0692 13.0574 25.0692C11.7403 25.0692 10.672 24.0008 10.672 22.6838C10.672 21.3665 11.7403 20.2981 13.0574 20.2981C13.2848 20.2981 13.5098 20.3304 13.7265 20.3935L15.7969 18.5704C15.6916 18.29 15.6159 17.9995 15.5709 17.7033L10.6353 17.0385C9.95997 18.2935 8.64337 19.0955 7.19197 19.0955C5.03325 19.0955 3.28247 17.3445 3.28247 15.186C3.28247 13.0274 5.03325 11.2767 7.19197 11.2767C9.09124 11.2767 10.695 12.6388 11.0349 14.4651L15.9696 15.13C16.0023 15.0638 16.037 14.9984 16.0733 14.9338L12.3026 11.0833C11.8133 11.2956 11.2855 11.405 10.7481 11.405C8.58948 11.405 6.83857 9.65414 6.83857 7.49554C6.83857 5.33695 8.58948 3.58604 10.7481 3.58604C12.073 3.58591 13.2928 4.2542 14.0107 5.34079Z" fill="#EA9123"/></svg>`

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Paints a framework-free boot splash into #root, called from the tiny
 * entry chunk BEFORE the react/react-dom/MUI chunks download. React's first
 * render replaces it with the visually-identical BootScreen component.
 *
 * This exists because the first React paint is gated on the Module
 * Federation shared chunks (react-dom is co-located with the ~700kB MUI
 * chunk), which takes over a second on mid-tier connections.
 */
export const showBootSplash = (): void => {
  const rootElement = document.getElementById('root')
  if (rootElement === null || rootElement.childElementCount > 0) {
    return
  }

  const version =
    typeof REACT_APP_VERSION !== 'undefined' ? REACT_APP_VERSION : 'Unknown'

  rootElement.innerHTML = `
<div class="boot-screen">
  <style>${BOOT_SCREEN_CSS}</style>
  <div class="boot-screen-main">
    <div class="boot-screen-logo">${CYTOSCAPE_LOGO_SVG}</div>
    <div class="boot-screen-text">
      <h1>Cytoscape Web</h1>
      <div class="boot-screen-version">
        <h2>Version ${escapeHtml(version)}</h2>
        <p class="boot-screen-built">&nbsp;</p>
      </div>
      <div class="boot-screen-message">
        <p>Loading application...</p>
        <div class="boot-screen-spinner"></div>
      </div>
    </div>
  </div>
  <p class="boot-screen-footer">Initial loading may take some time</p>
</div>`
}
