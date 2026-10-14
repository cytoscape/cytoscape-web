import Papa from 'papaparse'
import { describe, expect, it } from 'vitest'

import { dropLeadingLines } from '../model/impl/SkipLines'

// One metadata line, one header line, one data row — the shape that made the
// metadata line become the column names.
const rawText = ['# exported 2026-01-01', 'name,score', 'ABC,42'].join('\n')

describe('dropLeadingLines', () => {
  it('returns the text unchanged when nothing is skipped', () => {
    expect(dropLeadingLines(rawText, 0)).toBe(rawText)
    expect(dropLeadingLines(rawText, -1)).toBe(rawText)
  })

  it('drops the metadata line so the header row names the columns', () => {
    const result = Papa.parse(dropLeadingLines(rawText, 1), {
      header: true,
      skipEmptyLines: true,
    })

    expect(result.meta.fields).toEqual(['name', 'score'])
    expect(result.data).toEqual([{ name: 'ABC', score: '42' }])
  })

  it('leaves the header row in the data when the metadata line is kept', () => {
    const result = Papa.parse(rawText, {
      header: true,
      skipEmptyLines: true,
    })

    // The defect this guards against: the metadata line becomes the header and
    // the real header row is parsed as data.
    expect(result.meta.fields).toEqual(['# exported 2026-01-01'])
  })

  it('handles CRLF line endings', () => {
    const crlf = ['# meta', 'name,score', 'ABC,42'].join('\r\n')

    expect(dropLeadingLines(crlf, 1)).toBe('name,score\nABC,42')
  })
})
