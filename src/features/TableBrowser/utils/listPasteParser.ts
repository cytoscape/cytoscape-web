/**
 * Pure helpers for the "paste items" feature of the list-value editor (CW-563).
 *
 * Users can paste a blob of text and see exactly how it will be split into list
 * items. The parser is display-only: whatever separator is chosen, the result
 * is a plain array of item strings — the stored model stays a canonical list
 * (comma-serialized), independent of the paste separator.
 *
 * `segmentPastedText` returns an ordered list of segments (item tokens and the
 * separators between them) so the UI can highlight tokens and separators in
 * different colors.
 */

export type PasteDelimiter = 'newline' | 'comma' | 'tab' | 'semicolon'

/** Human-readable names for the separator control. */
export const DELIMITER_LABELS: Record<PasteDelimiter, string> = {
  newline: 'New line',
  comma: 'Comma',
  tab: 'Tab',
  semicolon: 'Semicolon',
}

/**
 * Visible glyph used to render a separator in the preview. Whitespace
 * separators (newline, tab) would otherwise be invisible.
 */
export const DELIMITER_DISPLAY: Record<PasteDelimiter, string> = {
  newline: '↵',
  comma: ',',
  tab: '⇥',
  semicolon: ';',
}

// Capturing regexes so `String.prototype.split` keeps the separators.
const DELIMITER_REGEX: Record<PasteDelimiter, RegExp> = {
  newline: /(\r\n|\r|\n)/,
  comma: /(,)/,
  tab: /(\t)/,
  semicolon: /(;)/,
}

export const ALL_DELIMITERS: PasteDelimiter[] = [
  'newline',
  'comma',
  'tab',
  'semicolon',
]

/**
 * Guess the separator from the pasted text. Priority: newline > tab > comma >
 * semicolon (a spreadsheet column paste is newline/tab separated). Defaults to
 * newline when nothing matches.
 */
export const detectDelimiter = (raw: string): PasteDelimiter => {
  if (/\r\n|\r|\n/.test(raw)) return 'newline'
  if (/\t/.test(raw)) return 'tab'
  if (/,/.test(raw)) return 'comma'
  if (/;/.test(raw)) return 'semicolon'
  return 'newline'
}

export interface PasteSegment {
  type: 'token' | 'delimiter'
  /** The raw text of this segment. */
  text: string
  /** What to render — separators use a visible glyph. */
  display: string
}

/**
 * Split raw pasted text into an ordered list of token/delimiter segments,
 * preserving the separators so the preview can color them. Empty tokens
 * (e.g. from consecutive separators or leading/trailing separators) are
 * omitted from the segment list.
 */
export const segmentPastedText = (
  raw: string,
  delimiter: PasteDelimiter,
): PasteSegment[] => {
  if (raw === '') {
    return []
  }
  // With a single capturing group, split() interleaves:
  // [token, sep, token, sep, ...] — even indices are tokens, odd are separators.
  const parts = raw.split(DELIMITER_REGEX[delimiter])
  const segments: PasteSegment[] = []
  parts.forEach((part, index) => {
    if (index % 2 === 1) {
      segments.push({
        type: 'delimiter',
        text: part,
        display: DELIMITER_DISPLAY[delimiter],
      })
    } else if (part !== '') {
      segments.push({ type: 'token', text: part, display: part })
    }
  })
  return segments
}

/**
 * The list items produced by a paste: token texts, trimmed, with blank entries
 * dropped. This is what Append/Replace feed into the editor rows.
 */
export const parsePastedItems = (
  raw: string,
  delimiter: PasteDelimiter,
): string[] =>
  segmentPastedText(raw, delimiter)
    .filter((s) => s.type === 'token')
    .map((s) => s.text.trim())
    .filter((t) => t.length > 0)
