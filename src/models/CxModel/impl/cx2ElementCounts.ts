/**
 * The node and edge counts a CX2 document declares in its metaData aspect,
 * read from the start of the file alone.
 *
 * CX2 puts metaData right after the version entry, so a few kilobytes hold
 * it, and the size of a local network can be checked before the whole file is
 * read and parsed. `elementCount` is optional in CX2: a count the metaData
 * does not give, or one this cannot find in `head`, is left out.
 */

export interface Cx2ElementCounts {
  nodeCount?: number
  edgeCount?: number
}

// An unescaped quote can only open a key or a string, never sit inside one,
// so this matches the aspect, not the same text inside an attribute value.
const METADATA_KEY = /\{\s*"metaData"\s*:\s*\[/

/** Index of the `]` closing the array that opens at `start`, or -1. */
const findArrayEnd = (text: string, start: number): number => {
  let depth = 0
  let inString = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inString) {
      if (c === '\\') {
        i++
      } else if (c === '"') {
        inString = false
      }
    } else if (c === '"') {
      inString = true
    } else if (c === '[' || c === '{') {
      depth++
    } else if (c === ']' || c === '}') {
      depth--
      if (depth === 0) {
        return i
      }
    }
  }
  return -1
}

const countOf = (entries: unknown[], name: string): number | undefined => {
  const entry = entries.find(
    (e): e is Record<string, unknown> =>
      typeof e === 'object' &&
      e !== null &&
      (e as { name?: unknown }).name === name,
  )
  const count = entry?.elementCount
  return typeof count === 'number' && Number.isInteger(count) && count >= 0
    ? count
    : undefined
}

export const readCx2ElementCounts = (head: string): Cx2ElementCounts => {
  const match = METADATA_KEY.exec(head)
  if (match === null) {
    return {}
  }
  const start = match.index + match[0].length - 1
  const end = findArrayEnd(head, start)
  if (end < 0) {
    return {}
  }
  let entries: unknown
  try {
    entries = JSON.parse(head.slice(start, end + 1))
  } catch {
    return {}
  }
  if (!Array.isArray(entries)) {
    return {}
  }
  const counts: Cx2ElementCounts = {}
  const nodeCount = countOf(entries, 'nodes')
  const edgeCount = countOf(entries, 'edges')
  if (nodeCount !== undefined) counts.nodeCount = nodeCount
  if (edgeCount !== undefined) counts.edgeCount = edgeCount
  return counts
}
