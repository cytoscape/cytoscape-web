// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  CITATIONS,
  citationsAsBibtex,
  citationsAsText,
  shortCitation,
  toBibtexAuthors,
} from './citations'

/** Each `@type{key, field = {value}, ...}` entry, parsed by brace depth. */
const parseBibtex = (
  bib: string,
): { type: string; key: string; fields: Record<string, string> }[] => {
  const entries: {
    type: string
    key: string
    fields: Record<string, string>
  }[] = []
  const header = /@(\w+)\{([^,\s]+),/g
  let match: RegExpExecArray | null
  while ((match = header.exec(bib)) !== null) {
    const fields: Record<string, string> = {}
    let i = header.lastIndex
    for (;;) {
      const field = /\s*(\w+)\s*=\s*\{/y
      field.lastIndex = i
      const f = field.exec(bib)
      if (f === null) break
      let depth = 1
      let j = field.lastIndex
      while (depth > 0) {
        if (j >= bib.length) throw new Error(`unbalanced braces in ${f[1]}`)
        if (bib[j] === '{') depth++
        if (bib[j] === '}') depth--
        j++
      }
      fields[f[1]] = bib.slice(field.lastIndex, j - 1)
      i = j
      if (bib[i] === ',') i++
    }
    if (!/^\s*\}/.test(bib.slice(i))) {
      throw new Error(`entry ${match[2]} is not closed`)
    }
    entries.push({ type: match[1], key: match[2], fields })
  }
  return entries
}

describe('citations', () => {
  it('formats every citation as plain text, one paragraph each', () => {
    const text = citationsAsText()
    const paragraphs = text.split('\n\n')

    expect(paragraphs).toHaveLength(CITATIONS.length)
    expect(paragraphs[0]).toBe(
      'Ono K, Fong D, Gao C, Churas C, Pillich R, Lenkiewicz J, Pratt D, Pico AR, Hanspers K, Xin Y, Morris J, Kucera M, Franz M, Lopes C, Bader G, Ideker T, Chen J. Cytoscape Web: bringing network biology to the browser. Nucleic Acids Research, gkaf365. 1 May. 2025, doi: 10.1093/nar/gkaf365. PMID: 40308211.',
    )
    expect(paragraphs[1]).toBe(
      'Shannon P, Markiel A, Ozier O, Baliga NS, Wang JT, Ramage D, Amin N, Schwikowski B, Ideker T. Cytoscape: a software environment for integrated models of biomolecular interaction networks. Genome Res, 13:11 (2498-504). 2003 Nov. PMID: 14597658.',
    )
  })

  it('converts the author list to BibTeX "Last, F. M." names', () => {
    expect(toBibtexAuthors('Baliga NS, Ideker T.')).toBe(
      'Baliga, N. S. and Ideker, T.',
    )
  })

  it('formats every citation as a parseable BibTeX entry', () => {
    const entries = parseBibtex(citationsAsBibtex())

    expect(entries.map((e) => e.key)).toEqual([
      'ono2025cytoscapeweb',
      'shannon2003cytoscape',
    ])
    for (const entry of entries) {
      expect(entry.type).toBe('article')
      expect(Object.keys(entry.fields)).toEqual(
        expect.arrayContaining(['author', 'title', 'journal', 'year', 'doi']),
      )
    }

    const [nar, genomeRes] = entries
    expect(nar.fields.doi).toBe('10.1093/nar/gkaf365')
    expect(nar.fields.year).toBe('2025')
    expect(nar.fields.pmid).toBe('40308211')
    expect(nar.fields.author.split(' and ')).toHaveLength(17)
    expect(nar.fields.author.startsWith('Ono, K. and Fong, D.')).toBe(true)
    // Braced so BibTeX styles keep the capitals.
    expect(nar.fields.title).toBe(
      '{Cytoscape Web}: bringing network biology to the browser',
    )

    expect(genomeRes.fields.doi).toBe('10.1101/gr.1239303')
    expect(genomeRes.fields.year).toBe('2003')
    expect(genomeRes.fields.pages).toBe('2498--2504')
  })

  it('shortens the Cytoscape Web paper to one line', () => {
    expect(shortCitation()).toBe(
      'Ono K et al. Cytoscape Web: bringing network biology to the browser. Nucleic Acids Research (2025).',
    )
  })
})
