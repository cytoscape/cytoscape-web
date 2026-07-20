/**
 * Parse `src/app-api/api_docs/ErrorCodes.md` into the `errorCodes[]` array.
 *
 *   ## AppCodes — runtime/registry concepts with no CX2 equivalent
 *   ### APP1 — `NETWORK_NOT_FOUND`
 *   **Severity:** error
 *   **Returned by:** `getNode`, `createEdge` (source/target lookup), ...
 *   <prose>
 *   **CX2 spec:** `cx2-node-requirements#N3` — "...".
 */
import { mdToHtml, mdToText, splitByHeadings } from './markdown'
import type { ErrorCode } from './types'

const CATALOG_RE = /^(\w+Codes)\s*(?:—\s*(.*))?$/
const ENTRY_RE = /^([A-Z]+\d+)(?:\s*—\s*`(\w+)`)?\s*$/

/** Pull the value of a `**Label:** value` line out of a body, plus the rest. */
function extractField(
  body: string,
  label: string,
): { value: string | null; rest: string } {
  const lines = body.split('\n')
  const out: string[] = []
  let value: string | null = null
  let capturing = false
  const startRe = new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.*)$`)
  for (const line of lines) {
    const m = line.match(startRe)
    if (m) {
      value = m[1]
      capturing = true
      continue
    }
    if (capturing) {
      // Field values may wrap across lines until a blank line or a new field.
      if (line.trim() === '' || /^\*\*\w[\w ]*:\*\*/.test(line)) {
        capturing = false
        if (line.trim() !== '') out.push(line)
        continue
      }
      value = (value ? value + ' ' : '') + line.trim()
      continue
    }
    out.push(line)
  }
  return { value: value ? value.trim() : null, rest: out.join('\n').trim() }
}

/** Split a `Returned by` value into bare method names (parentheticals dropped). */
function parseReturnedBy(value: string | null): string[] {
  if (!value) return []
  const names: string[] = []
  const re = /`([^`]+)`/g
  let m: RegExpExecArray | null
  while ((m = re.exec(value)) !== null) {
    // Drop trailing parentheticals like `createEdge (source/target lookup)`.
    const name = m[1].replace(/\s*\(.*$/, '').trim()
    if (name && !names.includes(name)) names.push(name)
  }
  return names
}

export function parseErrorCodes(md: string): ErrorCode[] {
  const { sections: catalogs } = splitByHeadings(md, 2)
  const codes: ErrorCode[] = []

  for (const cat of catalogs) {
    const cm = cat.heading.match(CATALOG_RE)
    if (!cm) continue
    const catalog = cm[1]
    const catalogSubtitle = (cm[2] || '').trim()

    const { sections: entries } = splitByHeadings(cat.body, 3)
    for (const entry of entries) {
      const em = entry.heading.match(ENTRY_RE)
      if (!em) continue
      const code = em[1]
      const name = em[2] || null

      let body = entry.body
      const sev = extractField(body, 'Severity')
      body = sev.rest
      const ret = extractField(body, 'Returned by')
      body = ret.rest
      const cx2 = extractField(body, 'CX2 spec')
      body = cx2.rest

      codes.push({
        code,
        name,
        catalog,
        catalogSubtitle,
        severity: sev.value ? sev.value.toLowerCase() : null,
        returnedBy: parseReturnedBy(ret.value),
        cx2Spec: cx2.value,
        descriptionHtml: mdToHtml(body),
        text: mdToText(
          `${code} ${name || ''} ${cx2.value || ''} ${mdToText(body)}`,
        ),
      })
    }
  }

  return codes
}
