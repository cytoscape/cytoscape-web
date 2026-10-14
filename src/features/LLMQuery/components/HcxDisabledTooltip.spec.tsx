import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HCX_DOCS_URL, HcxDisabledTooltip } from './HcxDisabledTooltip'

describe('HcxDisabledTooltip (CW-632)', () => {
  it('explains what HCX means in plain language', () => {
    render(<HcxDisabledTooltip />)

    // Spells out the acronym rather than only naming "HCX".
    expect(screen.getByText(/hierarchical networks \(HCX\)/i)).toBeTruthy()
    expect(screen.getByText(/systems and subsystems/i)).toBeTruthy()
  })

  it('links to documentation via a "Learn more" link', () => {
    render(<HcxDisabledTooltip />)

    const link = screen.getByRole('link', {
      name: /learn more/i,
    }) as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe(HCX_DOCS_URL)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })
})
