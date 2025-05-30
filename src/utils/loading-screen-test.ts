// Loading Screen Test Utilities
// This file provides utility functions for testing loading screen behavior

// Type declaration for global window object
declare global {
  interface Window {
    testLoadingScreen: () => boolean
    testMessageUpdate: () => boolean
    measureLoadingPerformance: () => {
      startTimer: () => number
      endTimer: () => number
    }
    debugLoadingScreen: () => void
  }
}

/**
 * Function to test loading screen display
 */
export const testLoadingScreen = () => {
  console.log('🧪 Starting loading screen test...')

  // 1. Check existence of loading screen element
  const loadingScreen = document.getElementById('initial-loading-screen')
  if (!loadingScreen) {
    console.error('❌ Loading screen not found')
    return false
  }
  console.log('✅ Loading screen element confirmed')

  // 2. Check existence of required child elements
  const requiredElements = [
    '.loading-content',
    '.loading-logo',
    '.loading-title',
    '.loading-message',
    '.loading-progress',
    '.progress-bar',
    '.progress-fill',
    '.progress-text',
    '.loading-spinner',
  ]

  for (const selector of requiredElements) {
    const element = loadingScreen.querySelector(selector)
    if (!element) {
      console.error(`❌ Required element not found: ${selector}`)
      return false
    }
  }
  console.log('✅ All required elements confirmed')

  // 3. Check CSS animations
  const logo = loadingScreen.querySelector('.loading-logo') as HTMLElement
  if (logo) {
    const computedStyle = window.getComputedStyle(logo)
    if (computedStyle.animation === 'none') {
      console.warn('⚠️ Logo animation not configured')
    } else {
      console.log('✅ Logo animation confirmed')
    }
  }

  // 4. Check progress bar animation
  const progressFill = loadingScreen.querySelector(
    '.progress-fill',
  ) as HTMLElement
  if (progressFill) {
    const progressStyle = window.getComputedStyle(progressFill)
    if (progressStyle.animation === 'none') {
      console.warn('⚠️ Progress bar animation not configured')
    } else {
      console.log('✅ Progress bar animation confirmed')
    }
  }

  console.log('🎉 Loading screen test completed')
  return true
}

/**
 * Function to test loading message updates
 */
export const testMessageUpdate = () => {
  console.log('🧪 Starting message update test...')

  const testMessages = ['Test message 1', 'Test message 2', 'Test message 3']

  const messageElement = document.querySelector('.loading-message')
  if (!messageElement) {
    console.error('❌ Message element not found')
    return false
  }

  const originalMessage = messageElement.textContent

  // Test message updates
  testMessages.forEach((message, index) => {
    setTimeout(
      () => {
        messageElement.textContent = message
        console.log(`✅ Message update ${index + 1}: ${message}`)

        if (index === testMessages.length - 1) {
          // Restore original message
          setTimeout(() => {
            messageElement.textContent = originalMessage
            console.log('🎉 Message update test completed')
          }, 1000)
        }
      },
      (index + 1) * 1000,
    )
  })

  return true
}

/**
 * Function to measure loading screen performance
 */
export const measureLoadingPerformance = () => {
  const startTime = performance.now()

  return {
    startTimer: () => startTime,
    endTimer: () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      console.log(`⏱️ Loading screen display time: ${duration.toFixed(2)}ms`)
      return duration
    },
  }
}

/**
 * Debug function: Output loading screen state
 */
export const debugLoadingScreen = () => {
  console.log('🔍 Loading screen debug info:')

  const loadingScreen = document.getElementById('initial-loading-screen')
  if (!loadingScreen) {
    console.log('❌ Loading screen does not exist')
    return
  }

  console.log('📊 Loading screen state:')
  console.log(
    '- Display state:',
    loadingScreen.style.display !== 'none' ? 'Visible' : 'Hidden',
  )
  console.log('- Z-Index:', window.getComputedStyle(loadingScreen).zIndex)
  console.log('- Position:', window.getComputedStyle(loadingScreen).position)

  const messageElement = loadingScreen.querySelector('.loading-message')
  if (messageElement) {
    console.log('- Current message:', messageElement.textContent)
  }

  const progressText = loadingScreen.querySelector('.progress-text')
  if (progressText) {
    console.log('- Current progress:', progressText.textContent)
  }
}

// Execute only in browser environment
if (typeof window !== 'undefined') {
  // Add test functions to global scope (for debugging)
  window.testLoadingScreen = testLoadingScreen
  window.testMessageUpdate = testMessageUpdate
  window.measureLoadingPerformance = measureLoadingPerformance
  window.debugLoadingScreen = debugLoadingScreen

  console.log('🛠️ Loading screen test utilities available:')
  console.log('- window.testLoadingScreen()')
  console.log('- window.testMessageUpdate()')
  console.log('- window.measureLoadingPerformance()')
  console.log('- window.debugLoadingScreen()')
}
