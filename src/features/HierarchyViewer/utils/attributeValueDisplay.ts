import { ValueType } from '../../../models/TableModel'
import { isMissingValue } from '../../../models/TableModel/impl/valueTypeImpl'
import { SingleValueType } from '../../../models/TableModel/ValueType'
import { isValidUrl } from '../../../utils/urlUtil'

/**
 * One displayable piece of an attribute value: a single value, or one item
 * of a list. `href` is set when the text should render as a link.
 */
export interface ValueDisplayItem {
  readonly text: string
  readonly href?: string
}

/**
 * An identifier namespace whose values link to an external page. `pattern`
 * must be anchored at both ends and capture the id the URL is built from.
 */
interface IdentifierLink {
  readonly pattern: RegExp
  readonly url: (id: string) => string
}

/**
 * Prefixed identifiers that link out. Only the prefixed form matches, so a
 * bare `ENSG…` stays plain text. The link is built from the id without its
 * version suffix; the displayed text is always the original value.
 */
const IDENTIFIER_LINKS: readonly IdentifierLink[] = [
  {
    // Ensembl gene, e.g. ensembl:ENSG00000103152 or ensembl:ENSG00000103152.12
    pattern: /^ensembl:(ENSG\d{11})(?:\.\d+)?$/i,
    url: (id) =>
      `https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(
        id.toUpperCase(),
      )}`,
  },
]

/**
 * The link target for a string value, if it has one: a prefixed identifier
 * from IDENTIFIER_LINKS, or the value itself when the whole value is an
 * http(s) URL. Any other scheme (javascript:, data:, ...) is never linked.
 *
 * @param text A string attribute value, or one item of a string list
 */
export const getValueLink = (text: string): string | undefined => {
  for (const { pattern, url } of IDENTIFIER_LINKS) {
    const match = pattern.exec(text)
    if (match !== null) {
      return url(match[1])
    }
  }

  // `new URL` percent-encodes inner whitespace, so text that merely starts
  // with a URL ("https://example.org is the site") would still parse
  if (/\s/.test(text) || !isValidUrl(text)) {
    return undefined
  }
  return new URL(text).href
}

const toItem = (value: SingleValueType): ValueDisplayItem => {
  const text = String(value)
  const href = typeof value === 'string' ? getValueLink(value) : undefined
  return href === undefined ? { text } : { text, href }
}

/**
 * Split an attribute value into displayable items: one for a single value,
 * one per element for a list. Returns an empty array when there is no value
 * to show (null, undefined, a blank string, or a list with no non-blank
 * items), so the caller can render a placeholder.
 *
 * @param value A table cell value; rows may hold null or omit the column
 */
export const getValueDisplayItems = (
  value: ValueType | null | undefined,
): ValueDisplayItem[] => {
  if (isMissingValue(value)) {
    return []
  }
  if (Array.isArray(value)) {
    return (value as SingleValueType[])
      .filter((item) => !isMissingValue(item))
      .map(toItem)
  }
  return [toItem(value as SingleValueType)]
}

/**
 * The value as plain text, list items separated by ", ". Returns undefined
 * when there is no value to show (see getValueDisplayItems).
 *
 * @param value A table cell value
 */
export const formatValueText = (
  value: ValueType | null | undefined,
): string | undefined => {
  const items = getValueDisplayItems(value)
  if (items.length === 0) {
    return undefined
  }
  return items.map((item) => item.text).join(', ')
}
