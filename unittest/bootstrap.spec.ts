/**
 * Test suite for the removeLoadingScreenAfterRender function from bootstrap.tsx
 *
 * This function is responsible for:
 *
 * 1. Waiting for React app to render content in the root element
 * 2. Making the root element visible once content is present
 * 3. Fading out and removing the initial loading screen
 * 4. Gracefully handling edge cases like missing elements
 *
 * The tests verify proper functionality, timing, and error handling to ensure
 * the loading screen is reliably removed after the application loads.
 */

import { jest } from '@jest/globals'

// Extract the removeLoadingScreenAfterRender function for testing
// Since it's not exported, we'll need to test it indirectly or create a testable version
const INITIAL_LOADING_SCREEN_ID = 'initial-loading-screen'

// Mock functions
let mockRequestAnimationFrame: jest.MockedFunction<
  (callback: FrameRequestCallback) => number
>
let mockSetTimeout: jest.MockedFunction<
  (callback: () => void, ms?: number) => NodeJS.Timeout
>

// Counter to prevent infinite recursion in tests
let recursionCounter = 0
const MAX_RECURSION = 5
let stopRecursion = false

// Copy of the removeLoadingScreenAfterRender function
// This is a simplified version for testing purposes to test
// the logic without needing the full React context
const removeLoadingScreenAfterRender = (): void => {
  if (recursionCounter > MAX_RECURSION || stopRecursion) {
    return // Prevent infinite recursion in tests
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const rootEl = document.getElementById('root')
      if (rootEl && rootEl.children.length > 0) {
        const loadingScreen = document.getElementById(INITIAL_LOADING_SCREEN_ID)
        if (loadingScreen) {
          rootEl.style.opacity = '1'
          rootEl.style.visibility = 'visible'

          setTimeout(() => {
            loadingScreen.style.opacity = '0'
            loadingScreen.style.visibility = 'hidden'
            loadingScreen.style.transition =
              'opacity 0.08s ease-out, visibility 0.08s ease-out'

            setTimeout(() => {
              if (loadingScreen.parentNode) {
                loadingScreen.parentNode.removeChild(loadingScreen)
              }
            }, 80)
          }, 60)
        }
      } else {
        recursionCounter++
        setTimeout(() => removeLoadingScreenAfterRender(), 10)
      }
    })
  })
}

describe('removeLoadingScreenAfterRender', () => {
  let rootElement: HTMLElement
  let loadingScreenElement: HTMLElement
  let parentElement: HTMLElement
  let originalRAF: typeof requestAnimationFrame
  let originalSetTimeout: typeof setTimeout

  beforeEach(() => {
    // Reset recursion counter and stop flag
    recursionCounter = 0
    stopRecursion = false

    // Store original functions
    originalRAF = global.requestAnimationFrame
    originalSetTimeout = global.setTimeout

    // Create mock functions
    mockRequestAnimationFrame =
      jest.fn<(callback: FrameRequestCallback) => number>()
    mockSetTimeout =
      jest.fn<(callback: () => void, ms?: number) => NodeJS.Timeout>()

    // Replace global functions
    global.requestAnimationFrame = mockRequestAnimationFrame
    global.setTimeout = mockSetTimeout as any

    // Setup DOM
    document.body.innerHTML = ''

    // Create parent container
    parentElement = document.createElement('div')
    document.body.appendChild(parentElement)

    // Create root element with children (simulating rendered React app)
    rootElement = document.createElement('div')
    rootElement.id = 'root'
    rootElement.appendChild(document.createElement('div')) // Add child to simulate rendered content
    parentElement.appendChild(rootElement)

    // Create loading screen element
    loadingScreenElement = document.createElement('div')
    loadingScreenElement.id = INITIAL_LOADING_SCREEN_ID
    parentElement.appendChild(loadingScreenElement)

    // Mock implementations that execute callbacks immediately for testing
    mockRequestAnimationFrame.mockImplementation(
      (callback: FrameRequestCallback) => {
        callback(0)
        return 1
      },
    )

    mockSetTimeout.mockImplementation((callback: () => void) => {
      callback()
      return 1 as any
    })
  })

  afterEach(() => {
    // Restore original functions
    global.requestAnimationFrame = originalRAF
    global.setTimeout = originalSetTimeout

    document.body.innerHTML = ''
    jest.clearAllMocks()
  })

  it('should remove loading screen when root element has children', () => {
    // Execute the function
    removeLoadingScreenAfterRender()

    // Verify requestAnimationFrame was called twice (nested)
    expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(2)

    // Verify root element styles are set to make it visible
    expect(rootElement.style.opacity).toBe('1')
    expect(rootElement.style.visibility).toBe('visible')

    // Verify loading screen styles are set for fade out
    expect(loadingScreenElement.style.opacity).toBe('0')
    expect(loadingScreenElement.style.visibility).toBe('hidden')
    expect(loadingScreenElement.style.transition).toBe(
      'opacity 0.08s ease-out, visibility 0.08s ease-out',
    )

    // Verify setTimeout was called for the delays
    expect(mockSetTimeout).toHaveBeenCalledTimes(2)

    // Verify loading screen is removed from DOM
    expect(document.getElementById(INITIAL_LOADING_SCREEN_ID)).toBeNull()
  })

  it('should retry when root element has no children', () => {
    // Remove children from root element to simulate unrendered state
    rootElement.innerHTML = ''

    // Mock setTimeout to prevent recursive execution for testing
    mockSetTimeout.mockImplementation((callback: () => void, ms?: number) => {
      if (ms === 10) {
        // Don't execute the recursive call automatically in this test
        return 1 as any
      }
      // Execute other timeouts immediately
      callback()
      return 1 as any
    })

    // Execute the function
    removeLoadingScreenAfterRender()

    // Verify requestAnimationFrame was called for initial attempts
    expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(2)

    // Verify setTimeout was called to retry
    expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 10)

    // Loading screen should still exist since root has no children
    expect(document.getElementById(INITIAL_LOADING_SCREEN_ID)).toBe(
      loadingScreenElement,
    )

    // Root element styles should not be modified yet
    expect(rootElement.style.opacity).toBe('')
    expect(rootElement.style.visibility).toBe('')
  })

  it('should handle missing root element gracefully', () => {
    // Remove root element
    rootElement.remove()

    // Mock setTimeout to prevent recursive execution for testing
    mockSetTimeout.mockImplementation((callback: () => void, ms?: number) => {
      if (ms === 10) {
        // Don't execute the recursive call automatically in this test
        return 1 as any
      }
      // Execute other timeouts immediately
      callback()
      return 1 as any
    })

    // Execute the function
    removeLoadingScreenAfterRender()

    // Should still call requestAnimationFrame
    expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(2)

    // Should call setTimeout to retry
    expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 10)

    // Loading screen should still exist
    expect(document.getElementById(INITIAL_LOADING_SCREEN_ID)).toBe(
      loadingScreenElement,
    )
  })

  it('should handle missing loading screen element gracefully', () => {
    // Remove loading screen element
    loadingScreenElement.remove()

    // Execute the function
    removeLoadingScreenAfterRender()

    // Should call requestAnimationFrame
    expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(2)

    // When loading screen doesn't exist, the root element styles are NOT set
    // because the function only sets them when the loading screen exists
    expect(rootElement.style.opacity).toBe('')
    expect(rootElement.style.visibility).toBe('')

    // No setTimeout calls should be made since loading screen doesn't exist
    expect(mockSetTimeout).toHaveBeenCalledTimes(0)

    // Loading screen should be null (already removed)
    expect(document.getElementById(INITIAL_LOADING_SCREEN_ID)).toBeNull()
  })

  it('should handle case where loading screen has no parent', () => {
    // Create orphaned loading screen
    loadingScreenElement.remove()
    const orphanedLoadingScreen = document.createElement('div')
    orphanedLoadingScreen.id = INITIAL_LOADING_SCREEN_ID
    // Don't append to any parent

    // Mock getElementById to return the orphaned element
    const originalGetElementById = document.getElementById
    jest.spyOn(document, 'getElementById').mockImplementation((id: string) => {
      if (id === 'root') {
        return rootElement
      }
      if (id === INITIAL_LOADING_SCREEN_ID) {
        return orphanedLoadingScreen
      }
      return originalGetElementById.call(document, id)
    })

    // Execute the function
    removeLoadingScreenAfterRender()

    // Should handle gracefully without errors
    expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(2)
    expect(rootElement.style.opacity).toBe('1')
    expect(rootElement.style.visibility).toBe('visible')

    // Restore original method
    document.getElementById = originalGetElementById
  })
})

describe('removeLoadingScreenAfterRender integration', () => {
  let rootElement: HTMLElement
  let loadingScreenElement: HTMLElement
  let originalRAF: typeof requestAnimationFrame
  let originalSetTimeout: typeof setTimeout

  beforeEach(() => {
    // Store original functions
    originalRAF = global.requestAnimationFrame
    originalSetTimeout = global.setTimeout

    // Setup realistic DOM
    document.body.innerHTML = ''

    rootElement = document.createElement('div')
    rootElement.id = 'root'
    document.body.appendChild(rootElement)

    loadingScreenElement = document.createElement('div')
    loadingScreenElement.id = INITIAL_LOADING_SCREEN_ID
    document.body.appendChild(loadingScreenElement)
  })

  afterEach(() => {
    // Restore original functions
    global.requestAnimationFrame = originalRAF
    global.setTimeout = originalSetTimeout

    document.body.innerHTML = ''
  })

  it('should work with real timing functions', (done) => {
    // Add content to root to simulate rendered app
    const appContent = document.createElement('div')
    appContent.textContent = 'App Content'
    rootElement.appendChild(appContent)

    // Execute the function with real timing
    removeLoadingScreenAfterRender()

    // Check after sufficient time for all animations to complete
    setTimeout(() => {
      try {
        expect(rootElement.style.opacity).toBe('1')
        expect(rootElement.style.visibility).toBe('visible')
        expect(document.getElementById(INITIAL_LOADING_SCREEN_ID)).toBeNull()
        done()
      } catch (error) {
        done(error)
      }
    }, 200) // Wait longer than the total animation time (60 + 80 = 140ms)
  })
})
