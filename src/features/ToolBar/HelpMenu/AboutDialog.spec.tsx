import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import packageInfo from '../../../../package.json'
import {
  AboutDialog,
  CODE_REPO_URL,
  CYTOSCAPE_DESKTOP_URL,
  CYTOSCAPE_HOME_URL,
  RELEASE_NOTES_URL,
  ROADMAP_URL,
} from './AboutDialog'

vi.mock('../../../data/db', () => ({
  getDatabaseVersion: () => 1,
}))

const expectExternalLink = (link: HTMLElement, href: string): void => {
  expect(link.getAttribute('href')).toBe(href)
  expect(link.getAttribute('target')).toBe('_blank')
  // Both: noopener blocks window.opener access from the new tab, noreferrer
  // keeps the app URL (workspace and network ids) out of the Referer header.
  expect(link.getAttribute('rel')).toContain('noopener')
  expect(link.getAttribute('rel')).toContain('noreferrer')
}

describe('AboutDialog (CW-578)', () => {
  const openDialog = (): void => {
    render(<AboutDialog open={true} onClose={vi.fn()} />)
  }

  it('renders the version as a link to the GitHub release notes', () => {
    openDialog()

    const link = screen.getByTestId('about-version-link') as HTMLAnchorElement
    expectExternalLink(link, RELEASE_NOTES_URL)
    expect(link.textContent).toContain(packageInfo.version)
  })

  it('shows the Cytoscape Web logo in the dialog', () => {
    openDialog()

    expect(screen.getByAltText('Cytoscape Web logo')).toBeTruthy()
  })

  it.each([
    ['open-source', CODE_REPO_URL],
    ['Cytoscape', CYTOSCAPE_DESKTOP_URL],
    ['website', CYTOSCAPE_HOME_URL],
    ['roadmap', ROADMAP_URL],
  ])('links "%s" to %s in a new tab', (name, href) => {
    openDialog()

    expectExternalLink(screen.getByRole('link', { name }), href)
  })
})
