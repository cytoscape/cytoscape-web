// src/components/UriIcon.spec.tsx
//
// The one rule apps are told: SVG icons are tinted (a mask over
// currentColor), raster icons are shown unchanged (an <img>).

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { cssUrl, isSvgIconUri, UriIcon } from './UriIcon'

const SVG_DATA = 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E'
const PNG_DATA = 'data:image/png;base64,iVBORw0KGgo='

const emittedCss = (): string =>
  Array.from(document.querySelectorAll('style'))
    .map((el) => el.textContent ?? '')
    .join('\n')

describe('isSvgIconUri', () => {
  it.each([
    SVG_DATA,
    'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    'DATA:IMAGE/SVG+XML,%3Csvg%3E',
    '/images/ndex-logo.svg',
    '/images/Logo.SVG',
    'https://example.org/icons/app.svg?v=3#id',
  ])('is true for %s', (uri) => {
    expect(isSvgIconUri(uri)).toBe(true)
  })

  it.each([
    PNG_DATA,
    '/images/logo.png',
    'https://example.org/logo.jpeg',
    // No extension: unknowable without a fetch, so treated as a picture.
    'https://example.org/icon',
    // The ".svg" is in the query, not the file name.
    'https://example.org/icon.png?from=old.svg',
  ])('is false for %s', (uri) => {
    expect(isSvgIconUri(uri)).toBe(false)
  })
})

describe('cssUrl', () => {
  it('percent-encodes the characters that could end or break a CSS url string', () => {
    expect(
      cssUrl('data:image/svg+xml,<svg xmlns="x" a=\'b\'>(1)\\</svg>'),
    ).toBe(
      'url("data:image/svg+xml,<svg xmlns=%22x%22 a=%27b%27>%281%29%5C</svg>")',
    )
  })

  it('leaves an already-encoded URI untouched', () => {
    expect(cssUrl(SVG_DATA)).toBe(`url("${SVG_DATA}")`)
    expect(cssUrl('/images/logo.svg?v=1#a')).toBe(
      'url("/images/logo.svg?v=1#a")',
    )
  })
})

describe('UriIcon', () => {
  it('paints an SVG as a mask in the text color, not an <img>', () => {
    render(<UriIcon src={SVG_DATA} size={20} data-testid="icon" />)

    const el = screen.getByTestId('icon')
    expect(el.tagName).toBe('DIV')
    expect(el.getAttribute('role')).toBe('img')
    // jsdom's cssstyle drops `mask-image`, so read the rule Emotion emitted
    // instead of the computed style.
    const css = emittedCss()
    expect(css).toContain(`mask-image:url("${SVG_DATA}")`)
    expect(css).toContain('background-color:currentColor')
  })

  it('keeps a raw SVG data URI with literal quotes as one well-formed mask url', () => {
    const raw = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'
    render(<UriIcon src={raw} size={20} data-testid="icon" />)

    const css = emittedCss()
    expect(css).toContain(
      'mask-image:url("data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22/>")',
    )
  })

  it('renders a raster image unchanged as a letterboxed <img>', () => {
    render(
      <UriIcon src={PNG_DATA} size={20} label="My App" data-testid="icon" />,
    )

    const el = screen.getByTestId('icon') as HTMLImageElement
    expect(el.tagName).toBe('IMG')
    expect(el.getAttribute('src')).toBe(PNG_DATA)
    expect(el.getAttribute('alt')).toBe('My App')
    // Emotion's stylesheet persists across tests in this file, so check the
    // rule for THIS element's class rather than the whole sheet.
    const emotionClass = Array.from(el.classList).find((c) =>
      c.startsWith('css-'),
    )
    const rule = emittedCss()
      .split('}')
      .find((r) => r.includes(`.${emotionClass}{`))
    expect(rule).toContain('object-fit:contain')
    expect(rule).not.toContain('mask-image')
  })

  it('marks a decorative SVG icon hidden from assistive tech, and names a labelled one', () => {
    render(
      <>
        <UriIcon src={SVG_DATA} size={20} data-testid="plain" />
        <UriIcon src={SVG_DATA} size={20} label="NDEx" data-testid="named" />
      </>,
    )

    expect(screen.getByTestId('plain').getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByTestId('named').getAttribute('aria-label')).toBe('NDEx')
    expect(screen.getByTestId('named').getAttribute('aria-hidden')).toBeNull()
  })
})
