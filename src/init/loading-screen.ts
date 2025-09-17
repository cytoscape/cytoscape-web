export const INITIAL_LOADING_SCREEN_ID = 'initial-loading-screen'

export const removeMessage = (id: string): void => {
  const element = document.getElementById(id)
  if (element && element.parentNode) {
    // Immediate removal without fade animation for faster response
    element.parentNode.removeChild(element)
  }
}

// Function to remove loading screen after React app is fully rendered
export const removeLoadingScreenAfterRender = (): void => {
  // Use multiple animation frames to ensure all rendering is complete
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // Check if React app has actually rendered content
      const rootEl = document.getElementById('root')
      if (rootEl && rootEl.children.length > 0) {
        const loadingScreen = document.getElementById(INITIAL_LOADING_SCREEN_ID)
        if (loadingScreen) {
          // First, make the app content visible and ready
          rootEl.style.opacity = '1'
          rootEl.style.visibility = 'visible'

          // Then wait for the app content to be displayed before starting the fade
          setTimeout(() => {
            // Set up the fade out with precise timing and visibility control
            loadingScreen.style.opacity = '0'
            loadingScreen.style.visibility = 'hidden'
            loadingScreen.style.transition =
              'opacity 0.08s ease-out, visibility 0.08s ease-out'

            // Remove the loading screen element after fade completes
            setTimeout(() => {
              if (loadingScreen.parentNode) {
                loadingScreen.parentNode.removeChild(loadingScreen)
              }
            }, 80)
          }, 60) // Slightly longer delay to ensure app is fully visible
        }
      } else {
        // If React hasn't rendered yet, try again very quickly
        setTimeout(() => removeLoadingScreenAfterRender(), 10)
      }
    })
  })
}

export const updateLoadingMessage = (message: string): void => {
  const loadingScreen = document.getElementById(INITIAL_LOADING_SCREEN_ID)
  if (loadingScreen) {
    const messageElement = loadingScreen.querySelector('.loading-message')

    if (messageElement) {
      messageElement.textContent = message
    }
  }
}

// Constants injected by webpack DefinePlugin
export declare const REACT_APP_VERSION: string
export declare const REACT_APP_BUILD_TIME: string

export const updateVersionText = (): void => {
  const versionElement = document.getElementById('version-text')
  const buildTimeElement = document.getElementById('build-time-text')

  if (versionElement) {
    const version =
      typeof REACT_APP_VERSION !== 'undefined' ? REACT_APP_VERSION : 'Unknown'
    versionElement.textContent = `Version ${version}`
  }

  if (buildTimeElement) {
    const buildTime =
      typeof REACT_APP_BUILD_TIME !== 'undefined'
        ? REACT_APP_BUILD_TIME
        : 'Unknown'
    // Format the build time to be more readable
    let formattedBuildTime = buildTime
    if (buildTime !== 'Unknown') {
      try {
        const date = new Date(buildTime)
        formattedBuildTime = date.toLocaleString()
      } catch (e) {
        // If parsing fails, use the raw string
        formattedBuildTime = buildTime
      }
    }
    buildTimeElement.textContent = `Built on: ${formattedBuildTime}`
  }
}
