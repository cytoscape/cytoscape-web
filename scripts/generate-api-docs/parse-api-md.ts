/**
 * Parse `src/app-api/api_docs/Api.md` into `namespaces[]` (the API reference)
 * and `guides[]` (the non-namespace prose sections: Overview, Event Bus, App
 * Lifecycle, window.CyWebApi, ...).
 *
 * Structure:
 *   ## ElementApi (`cyweb/ElementApi`)      → namespace
 *   ### Types                               → a "Types" code group (typesHtml)
 *   ### Methods | Graph Traversal | ...      → a method group
 *   #### `getNode(networkId, nodeId): ApiResult<NodeData>`   → a method
 *       <prose>
 *       | Error Code | Condition |          → lifted into errorRefs
 */
import { mdToHtml, mdToText, slug, splitByHeadings } from './markdown'
import type {
  Guide,
  MethodErrorRef,
  ReferenceGroup,
  ReferenceMethod,
  ReferenceNamespace,
} from './types'
import { NAMESPACE_INTERFACES } from './extract-surface'

const NAMESPACE_RE = /^(\w+Api)\b(?:\s*\(`([^`]+)`\))?/
const METHOD_HEADING_RE =
  /^`([A-Za-z_][\w]*)\s*\(([\s\S]*?)\)\s*:\s*([\s\S]+?)`$/

const INTERFACE_KEY: Record<string, string> = Object.fromEntries(
  NAMESPACE_INTERFACES.map((n) => [n.interfaceName, n.key]),
)

/** Render inline markdown (no wrapping <p>). */
function mdInline(md: string): string {
  const html = mdToHtml(md).trim()
  return html
    .replace(/^<p>/, '')
    .replace(/<\/p>$/, '')
    .trim()
}

/**
 * Pull a trailing GFM error table out of a method body. Returns the remaining
 * description markdown plus the parsed error rows (empty if no such table).
 */
function extractErrorTable(body: string): {
  description: string
  errorRefs: MethodErrorRef[]
} {
  const lines = body.split('\n')
  // Find the last contiguous run of table lines (leading `|`).
  let end = lines.length
  while (end > 0 && lines[end - 1].trim() === '') end--
  if (end === 0 || !lines[end - 1].trim().startsWith('|')) {
    return { description: body, errorRefs: [] }
  }
  let start = end
  while (start > 0 && lines[start - 1].trim().startsWith('|')) start--

  const tableLines = lines.slice(start, end)
  const header = tableLines[0] || ''
  if (!/error\s*code/i.test(header)) {
    return { description: body, errorRefs: [] }
  }

  const errorRefs: MethodErrorRef[] = []
  for (const row of tableLines.slice(2)) {
    const cells = row
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim())
    if (cells.length < 2) continue
    const code = cells[0].replace(/`/g, '').trim()
    if (!code) continue
    errorRefs.push({ code, condition: mdInline(cells.slice(1).join(' | ')) })
  }

  const description = lines.slice(0, start).join('\n').trim()
  return { description, errorRefs }
}

function parseMethods(
  groupBody: string,
  namespaceKey: string,
): {
  intro: string
  methods: ReferenceMethod[]
} {
  const { preamble, sections } = splitByHeadings(groupBody, 4)
  const methods: ReferenceMethod[] = []
  for (const s of sections) {
    const hm = s.heading.match(METHOD_HEADING_RE)
    if (!hm) continue
    const name = hm[1]
    const params = hm[2].replace(/\s+/g, ' ').trim()
    const ret = hm[3].replace(/\s+/g, ' ').trim()
    const docSignature = `${name}(${params}): ${ret}`
    const { description, errorRefs } = extractErrorTable(s.body)
    methods.push({
      name,
      anchor: `${namespaceKey}.${name}`,
      docSignature,
      tsSignature: null,
      descriptionHtml: mdToHtml(description),
      text: mdToText(`${docSignature} ${description}`),
      errorRefs,
    })
  }
  return { intro: preamble, methods }
}

export interface ParsedApiMd {
  namespaces: ReferenceNamespace[]
  guides: Guide[]
}

export function parseApiMd(md: string): ParsedApiMd {
  const { sections } = splitByHeadings(md, 2)
  const namespaces: ReferenceNamespace[] = []
  const guides: Guide[] = []

  for (const section of sections) {
    const nm = section.heading.match(NAMESPACE_RE)
    const isNamespace = nm && /Api$/.test(nm[1])

    if (isNamespace) {
      const name = nm[1]
      const moduleId = nm[2] || null
      const key = INTERFACE_KEY[name] || name.replace(/Api$/, '').toLowerCase()

      const { preamble, sections: groupSections } = splitByHeadings(
        section.body,
        3,
      )
      const groups: ReferenceGroup[] = []
      for (const g of groupSections) {
        if (/^types$/i.test(g.heading)) {
          groups.push({
            title: 'Types',
            typesHtml: mdToHtml(g.body),
            methods: [],
          })
          continue
        }
        const { intro, methods } = parseMethods(g.body, key)
        if (methods.length === 0 && intro.trim() === '') continue
        groups.push({
          title: g.heading,
          intHtml: intro ? mdToHtml(intro) : undefined,
          methods,
        })
      }

      namespaces.push({
        name,
        moduleId,
        key,
        descriptionHtml: mdToHtml(preamble),
        groups,
      })
    } else {
      guides.push({
        title: section.heading,
        anchor: slug(section.heading),
        html: mdToHtml(section.body),
        text: mdToText(section.body),
      })
    }
  }

  return { namespaces, guides }
}
