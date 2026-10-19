import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CookieConsentWidget } from './CookieConsent'

describe('CookieConsentWidget', () => {
  it('links "Learn more" to the privacy policy in the in-app manual', () => {
    render(<CookieConsentWidget />)
    const link = screen.getByRole('link', { name: 'Learn more' })
    // The repository file it used to point at moved to docs/ and 404s.
    expect(link.getAttribute('href')).toBe(
      `${import.meta.env.BASE_URL}manual/privacy-policy`,
    )
    // A new tab: following it must not unload the user's editor.
    expect(link.getAttribute('target')).toBe('_blank')
  })
})
