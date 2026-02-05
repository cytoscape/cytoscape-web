/**
 * Crash Data Consent Hook
 *
 * Manages user consent for sending crash data reports.
 * Uses localStorage to persist consent preference.
 * 
 * Opt-out model: Consent is granted by default (unknown = accepted).
 * Users can decline if they choose.
 */

import { useState, useEffect, useCallback } from 'react'

const CONSENT_STORAGE_KEY = 'cytoscapeWebCrashDataConsent'
const CONSENT_EXPIRY_DAYS = 365

export type ConsentStatus = 'unknown' | 'accepted' | 'declined'

/**
 * Gets the current crash data consent status from localStorage.
 * In opt-out model, 'unknown' means consent is granted by default.
 */
export const getCrashDataConsent = (): ConsentStatus => {
  if (typeof window === 'undefined') {
    return 'unknown' // Default to accepted (opt-out)
  }

  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!stored) {
      return 'unknown' // Default to accepted (opt-out)
    }

    const consent = JSON.parse(stored)
    const now = new Date().getTime()

    // Check if consent has expired
    if (consent.expiry && now > consent.expiry) {
      localStorage.removeItem(CONSENT_STORAGE_KEY)
      return 'unknown' // Default to accepted (opt-out) when expired
    }

    return consent.status || 'unknown' // Default to accepted (opt-out)
  } catch {
    return 'unknown' // Default to accepted (opt-out)
  }
}

/**
 * Sets the crash data consent status in localStorage.
 */
export const setCrashDataConsent = (status: 'accepted' | 'declined'): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const expiry = new Date().getTime() + CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    const consent = {
      status,
      expiry,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent))
  } catch (error) {
    // Handle quota exceeded or other errors silently
  }
}

/**
 * Hook to manage crash data consent.
 *
 * @returns Object with consent status and functions to accept/decline
 */
export const useCrashDataConsent = () => {
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>(() =>
    getCrashDataConsent(),
  )

  useEffect(() => {
    // Sync with localStorage on mount
    setConsentStatus(getCrashDataConsent())
  }, [])

  const accept = useCallback(() => {
    setCrashDataConsent('accepted')
    setConsentStatus('accepted')
  }, [])

  const decline = useCallback(() => {
    setCrashDataConsent('declined')
    setConsentStatus('declined')
  }, [])

  // Opt-out model: 'unknown' means consent is granted by default
  const hasConsented = consentStatus === 'accepted' || consentStatus === 'unknown'
  // Show dialog only if user hasn't explicitly made a choice (first time)
  const needsConsent = consentStatus === 'unknown'

  return {
    consentStatus,
    hasConsented,
    needsConsent,
    accept,
    decline,
  }
}

