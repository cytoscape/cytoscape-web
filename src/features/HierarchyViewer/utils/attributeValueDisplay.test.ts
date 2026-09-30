// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  formatValueText,
  getValueDisplayItems,
  getValueLink,
} from './attributeValueDisplay'

const NCBI = 'https://www.ncbi.nlm.nih.gov/gene/?term='

describe('getValueLink', () => {
  it('links an http or https URL to itself', () => {
    expect(getValueLink('https://example.org/a?b=1')).toBe(
      'https://example.org/a?b=1',
    )
    expect(
      getValueLink(
        'http://images.proteinatlas.org/39730/534_B10_1_blue_red_green.jpg',
      ),
    ).toBe('http://images.proteinatlas.org/39730/534_B10_1_blue_red_green.jpg')
  })

  it('never links other schemes', () => {
    expect(getValueLink('javascript:alert(1)')).toBeUndefined()
    expect(getValueLink('JavaScript:alert(1)')).toBeUndefined()
    expect(getValueLink('data:text/html,<script>alert(1)</script>')).toBe(
      undefined,
    )
    expect(getValueLink('ftp://example.org/file')).toBeUndefined()
    expect(getValueLink('mailto:someone@example.org')).toBeUndefined()
  })

  it('does not link text that only contains or starts with a URL', () => {
    expect(getValueLink('see https://example.org')).toBeUndefined()
    expect(getValueLink('https://example.org is the site')).toBeUndefined()
    expect(getValueLink(' https://example.org')).toBeUndefined()
    expect(getValueLink('example.org')).toBeUndefined()
    expect(getValueLink('')).toBeUndefined()
  })

  it('links a prefixed Ensembl gene id to NCBI Gene', () => {
    expect(getValueLink('ensembl:ENSG00000103152')).toBe(
      `${NCBI}ENSG00000103152`,
    )
  })

  it('matches the ensembl prefix and the id case-insensitively', () => {
    expect(getValueLink('Ensembl:ENSG00000103152')).toBe(
      `${NCBI}ENSG00000103152`,
    )
    expect(getValueLink('ENSEMBL:ensg00000103152')).toBe(
      `${NCBI}ENSG00000103152`,
    )
  })

  it('drops the version suffix of an Ensembl id from the link', () => {
    expect(getValueLink('ensembl:ENSG00000103152.12')).toBe(
      `${NCBI}ENSG00000103152`,
    )
  })

  it('does not link a malformed or unprefixed Ensembl id', () => {
    expect(getValueLink('ENSG00000103152')).toBeUndefined()
    expect(getValueLink('ensembl:ENSG0000010315')).toBeUndefined()
    expect(getValueLink('ensembl:ENSG000001031520')).toBeUndefined()
    expect(getValueLink('ensembl:ENST00000103152')).toBeUndefined()
    expect(getValueLink('ensembl:ENSG00000103152.')).toBeUndefined()
    expect(getValueLink('ensembl:ENSG00000103152 ')).toBeUndefined()
    expect(getValueLink('xensembl:ENSG00000103152')).toBeUndefined()
  })

  it('stays fast on long near-miss input', () => {
    // A guard against catastrophic backtracking, which would take seconds
    // here; the headroom keeps slow CI runners from failing it
    const start = performance.now()
    getValueLink(`ensembl:ENSG${'0'.repeat(50_000)}x`)
    getValueLink(`ensembl:ENSG00000103152.${'1'.repeat(50_000)}x`)
    expect(performance.now() - start).toBeLessThan(1000)
  })
})

describe('getValueDisplayItems', () => {
  it('returns no items for null, undefined and empty lists', () => {
    expect(getValueDisplayItems(null)).toEqual([])
    expect(getValueDisplayItems(undefined)).toEqual([])
    expect(getValueDisplayItems([])).toEqual([])
  })

  it('returns no items for an empty or blank string', () => {
    // The table browser writes '' when a string cell is cleared
    expect(getValueDisplayItems('')).toEqual([])
    expect(getValueDisplayItems('  ')).toEqual([])
    expect(getValueDisplayItems(['', ' '])).toEqual([])
  })

  it('keeps strings with surrounding spaces as they are', () => {
    expect(getValueDisplayItems(' a ')).toEqual([{ text: ' a ' }])
  })

  it('returns one item for a single value of each type', () => {
    expect(getValueDisplayItems('alice')).toEqual([{ text: 'alice' }])
    expect(getValueDisplayItems(0)).toEqual([{ text: '0' }])
    expect(getValueDisplayItems(1.5)).toEqual([{ text: '1.5' }])
    expect(getValueDisplayItems(true)).toEqual([{ text: 'true' }])
    expect(getValueDisplayItems(false)).toEqual([{ text: 'false' }])
  })

  it('returns one item per list element', () => {
    expect(getValueDisplayItems(['alice', 'bob', 'mary'])).toEqual([
      { text: 'alice' },
      { text: 'bob' },
      { text: 'mary' },
    ])
    expect(getValueDisplayItems([1, 2.5])).toEqual([
      { text: '1' },
      { text: '2.5' },
    ])
    expect(getValueDisplayItems([true, false])).toEqual([
      { text: 'true' },
      { text: 'false' },
    ])
  })

  it('links the string items that are links, keeping the original text', () => {
    expect(
      getValueDisplayItems([
        'ensembl:ENSG00000103152.3',
        'plain',
        'https://example.org',
      ]),
    ).toEqual([
      {
        text: 'ensembl:ENSG00000103152.3',
        href: `${NCBI}ENSG00000103152`,
      },
      { text: 'plain' },
      { text: 'https://example.org', href: 'https://example.org/' },
    ])
  })

  it('skips null and blank elements of a list', () => {
    expect(
      getValueDisplayItems(['a', null, '', 'b'] as unknown as string[]),
    ).toEqual([{ text: 'a' }, { text: 'b' }])
  })
})

describe('formatValueText', () => {
  it('joins list items with a comma and a space', () => {
    expect(formatValueText(['alice', 'bob', 'mary'])).toBe('alice, bob, mary')
    expect(formatValueText([1, 2, 3])).toBe('1, 2, 3')
    expect(formatValueText([true, false])).toBe('true, false')
  })

  it('formats single values', () => {
    expect(formatValueText(true)).toBe('true')
    expect(formatValueText(42)).toBe('42')
    expect(formatValueText('x')).toBe('x')
  })

  it('returns undefined when there is no value', () => {
    expect(formatValueText(null)).toBeUndefined()
    expect(formatValueText(undefined)).toBeUndefined()
    expect(formatValueText([])).toBeUndefined()
  })
})
