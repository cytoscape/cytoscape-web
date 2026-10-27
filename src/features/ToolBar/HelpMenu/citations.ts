/**
 * The papers to cite for Cytoscape Web, and their plain-text and BibTeX forms.
 *
 * Shared by Help → Citation and the image export dialog (#883), so both copy
 * the same text.
 */

export interface CitationData {
  authors: string
  title: string
  journal?: string
  details: string
  doi?: {
    text: string
    url: string
  }
  pmid: {
    id: string
    url: string
  }
  /** Fields the display text does not carry, or carries in another form. */
  bibtex: {
    key: string
    /** Capitals that must survive a BibTeX style are wrapped in braces. */
    title: string
    year: string
    volume?: string
    number?: string
    pages: string
    doi: string
  }
}

export const CITATIONS: CitationData[] = [
  {
    authors:
      'Ono K, Fong D, Gao C, Churas C, Pillich R, Lenkiewicz J, Pratt D, Pico AR, Hanspers K, Xin Y, Morris J, Kucera M, Franz M, Lopes C, Bader G, Ideker T, Chen J.',
    title: 'Cytoscape Web: bringing network biology to the browser.',
    journal: 'Nucleic Acids Research',
    details: ', gkaf365. 1 May. 2025, ',
    doi: {
      text: 'doi: 10.1093/nar/gkaf365',
      url: 'https://academic.oup.com/nar/advance-article/doi/10.1093/nar/gkaf365/8123447',
    },
    pmid: {
      id: '40308211',
      url: 'https://pubmed.ncbi.nlm.nih.gov/40308211/',
    },
    bibtex: {
      key: 'ono2025cytoscapeweb',
      title: '{Cytoscape Web}: bringing network biology to the browser',
      year: '2025',
      pages: 'gkaf365',
      doi: '10.1093/nar/gkaf365',
    },
  },
  {
    authors:
      'Shannon P, Markiel A, Ozier O, Baliga NS, Wang JT, Ramage D, Amin N, Schwikowski B, Ideker T.',
    title:
      'Cytoscape: a software environment for integrated models of biomolecular interaction networks.',
    journal: 'Genome Res',
    details: ', 13:11 (2498-504). 2003 Nov. PMID: ',
    pmid: {
      id: '14597658',
      url: 'https://pubmed.ncbi.nlm.nih.gov/14597658/',
    },
    bibtex: {
      key: 'shannon2003cytoscape',
      title:
        '{Cytoscape}: a software environment for integrated models of biomolecular interaction networks',
      year: '2003',
      volume: '13',
      number: '11',
      pages: '2498--2504',
      doi: '10.1101/gr.1239303',
    },
  },
]

/** One citation as it reads in the dialog, links flattened to their text. */
const citationAsText = (citation: CitationData): string => {
  let text = `${citation.authors} ${citation.title}`
  if (citation.journal) {
    text += ` ${citation.journal}`
  }
  text += citation.details
  if (citation.doi) {
    text += `${citation.doi.text}. PMID: `
  }
  return `${text}${citation.pmid.id}.`
}

/** Every citation as plain text, one paragraph each. */
export const citationsAsText = (): string =>
  CITATIONS.map(citationAsText).join('\n\n')

/**
 * "Ono K, Pico AR." → "Ono, K. and Pico, A. R.": BibTeX reads a bare "AR" as
 * one name, so each initial gets its own period.
 */
export const toBibtexAuthors = (authors: string): string =>
  authors
    .replace(/\.$/, '')
    .split(', ')
    .map((author) => {
      const parts = author.trim().split(' ')
      const initials = parts.pop() ?? ''
      return `${parts.join(' ')}, ${initials.split('').join('. ')}.`
    })
    .join(' and ')

const citationAsBibtex = (citation: CitationData): string => {
  const { bibtex } = citation
  const fields: [string, string | undefined][] = [
    ['author', toBibtexAuthors(citation.authors)],
    ['title', bibtex.title],
    ['journal', citation.journal],
    ['year', bibtex.year],
    ['volume', bibtex.volume],
    ['number', bibtex.number],
    ['pages', bibtex.pages],
    ['doi', bibtex.doi],
    ['pmid', citation.pmid.id],
  ]
  const body = fields
    .filter((field): field is [string, string] => field[1] !== undefined)
    .map(([name, value]) => `  ${name} = {${value}},`)
    .join('\n')
  return `@article{${bibtex.key},\n${body}\n}`
}

/** Every citation as a BibTeX `@article` entry, ready for a `.bib` file. */
export const citationsAsBibtex = (): string =>
  CITATIONS.map(citationAsBibtex).join('\n\n')
