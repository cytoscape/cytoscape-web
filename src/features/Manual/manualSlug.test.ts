// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  classifyManualLink,
  resolveManualAsset,
  slugifyHeading,
} from './manualSlug'
import { MANUAL_PAGES, resolveManualPath } from './pages'

describe('slugifyHeading', () => {
  it.each([
    ['How Mappings Work', 'how-mappings-work'],
    [
      'Creating a Basic Style with Discrete and Continuous Mappings',
      'creating-a-basic-style-with-discrete-and-continuous-mappings',
    ],
    ['Import Network from File', 'import-network-from-file'],
    ['URL Query Parameters', 'url-query-parameters'],
    ['  Data → Open  ', 'data-open'],
  ])('%s → %s', (text, slug) => {
    expect(slugifyHeading(text)).toBe(slug)
  })
})

describe('resolveManualAsset', () => {
  it('prefixes relative paths with the base URL', () => {
    expect(resolveManualAsset('manual-assets/a.jpg', '/')).toBe(
      '/manual-assets/a.jpg',
    )
    expect(resolveManualAsset('manual-assets/a.jpg', '/cytoscape')).toBe(
      '/cytoscape/manual-assets/a.jpg',
    )
  })

  it('leaves absolute and data URLs alone', () => {
    expect(resolveManualAsset('https://x.org/a.png', '/b/')).toBe(
      'https://x.org/a.png',
    )
    expect(resolveManualAsset('/a.png', '/b/')).toBe('/a.png')
  })
})

describe('classifyManualLink', () => {
  it.each([
    ['styles', 'page'],
    ['styles#how-mappings-work', 'page'],
    ['#how-mappings-work', 'page'],
    ['https://www.ndexbio.org', 'external'],
    ['mailto:a@b.org', 'external'],
    ['/', 'app'],
  ] as const)('%s is %s', (href, kind) => {
    expect(classifyManualLink(href)).toBe(kind)
  })
})

describe('resolveManualPath', () => {
  it('opens the first page for the bare route', () => {
    expect(resolveManualPath('')).toBe('introduction')
    expect(resolveManualPath('/')).toBe('introduction')
  })

  it('accepts current slugs', () => {
    expect(resolveManualPath('styles')).toBe('styles')
  })

  it.each([
    ['Styles.html', 'styles'],
    ['en/latest/Styles.html', 'styles'],
    ['en/latest/Node_and_Edge_Column_Data.html', 'node-and-edge-column-data'],
    ['Quick_Tour_of_Cytoscape', 'quick-tour'],
    ['en/latest/index.html', 'introduction'],
  ])('maps the Read the Docs path %s to %s', (path, slug) => {
    expect(resolveManualPath(path)).toBe(slug)
  })

  it('returns undefined for unknown pages', () => {
    expect(resolveManualPath('nope')).toBeUndefined()
    expect(resolveManualPath('en/latest/Nope.html')).toBeUndefined()
  })

  it('has unique slugs and legacy names', () => {
    const slugs = MANUAL_PAGES.map((p) => p.slug)
    const legacy = MANUAL_PAGES.map((p) => p.legacyName)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(new Set(legacy).size).toBe(legacy.length)
  })
})
