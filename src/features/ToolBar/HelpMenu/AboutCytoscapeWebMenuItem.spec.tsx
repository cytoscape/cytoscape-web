import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import packageInfo from '../../../../package.json'
import {
  AboutCytoscapeWebMenuItem,
  RELEASE_NOTES_URL,
} from './AboutCytoscapeWebMenuItem'

vi.mock('../../../data/db', () => ({
  getDatabaseVersion: () => 1,
}))

describe('AboutCytoscapeWebMenuItem (CW-578)', () => {
  const openDialog = (): void => {
    render(<AboutCytoscapeWebMenuItem onClick={vi.fn()} />)
    fireEvent.click(screen.getByText('About Cytoscape Web'))
  }

  it('renders the version as a link to the GitHub release notes', () => {
    openDialog()

    const link = screen.getByTestId('about-version-link') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe(RELEASE_NOTES_URL)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(link.textContent).toContain(packageInfo.version)
  })

  it('shows the Cytoscape Web logo in the dialog', () => {
    openDialog()

    expect(screen.getByAltText('Cytoscape Web logo')).toBeTruthy()
  })
})
