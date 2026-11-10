import type { VisualPropertyGroup } from '@/models/VisualStyleModel'
import { visualPropertyRows } from './generated/visualPropertyRows'
import { MANUAL_PAGES } from './pages'
import {
  findScreenshotRecipe,
  findScreenshotSequence,
  screenshotPath,
  sequenceFramePath,
} from './screenshots/recipes'

/**
 * Converts the manual's MDX pages to MyST Markdown for the Read the Docs
 * manual (cytoscape/web-cytoscape-manual, Sphinx with myst-parser), #868.
 * Pure: `scripts/export-manual-myst.mts` reads the pages and writes the files.
 *
 * Live demos are left out. Any JSX tag left after conversion throws, so a new
 * component cannot reach the static manual unconverted.
 */

// Copied from components/VisualPropertyTable.tsx, which imports React.
const TYPE_LABELS: Record<string, string> = {
  color: 'Color',
  number: 'Number',
  string: 'Text',
  boolean: 'Yes / No',
  font: 'Font',
  nodeShape: 'Node shape',
  edgeLine: 'Line type',
  nodeBorderLine: 'Line type',
  edgeArrowShape: 'Arrow shape',
  horizontalAlign: 'Alignment',
  verticalAlign: 'Alignment',
  visibility: 'Visible / hidden',
  nodeLabelPosition: 'Label position',
  customGraphic: 'Image or chart',
  customGraphicPosition: 'Position',
}

/** File names of pages the Read the Docs manual did not have before 1.1. */
export const NEW_PAGE_NAMES: Readonly<Record<string, string>> = {
  menus: 'Menus',
  'workspace-panels': 'Workspace_Panels',
  'network-view': 'Network_View',
  filters: 'Filters',
}

/** Where `<UiIcon name>` images live in the Read the Docs repo's `docs/`. */
export const UI_ICON_DIR = '_static/images/ui-icons'

/** `public/manual-assets/` is copied to this directory of `docs/`. */
export const IMAGE_DIR = '_static/images'

/** The page's file name on Read the Docs, without `.md`. */
export const mystFileName = (slug: string): string => {
  const page = MANUAL_PAGES.find((p) => p.slug === slug)
  if (page === undefined) throw new Error(`Unknown page: ${slug}`)
  const name = page.legacyName ?? NEW_PAGE_NAMES[slug]
  if (name === undefined) {
    throw new Error(
      `No Read the Docs file name for ${slug}: add it to NEW_PAGE_NAMES`,
    )
  }
  return name
}

/** The Sphinx label of a raw anchor. Labels are global, so page-prefixed. */
export const mystLabel = (slug: string, id: string): string =>
  `${mystFileName(slug)}-${id}`

const asset = (p: string): string =>
  p.replace(/^\/?manual-assets\//, `${IMAGE_DIR}/`)

const cell = (s: string): string => s.replace(/\|/g, '\\|')

const propertyTable = (group: VisualPropertyGroup): string =>
  [
    '| Property | Value | Default | Description |',
    '| --- | --- | --- | --- |',
    ...visualPropertyRows(group).map(
      (row) =>
        `| **${cell(row.displayName)}** | ${TYPE_LABELS[row.type]} | \`${row.defaultValue}\` | ${cell(row.description ?? '')} |`,
    ),
  ].join('\n')

const attr = (tag: string, name: string): string => {
  const value = new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1]
  if (value === undefined) throw new Error(`${tag} has no ${name}`)
  return value
}

const icon = (tag: string): string =>
  `![${attr(tag, 'label')}](${UI_ICON_DIR}/${attr(tag, 'name')}.png)`

/** A `<Steps>` block: its numbered list, each frame's image under its step. */
const steps = (sequenceId: string, body: string): string => {
  const sequence = findScreenshotSequence(sequenceId)
  if (sequence === undefined) throw new Error(`Unknown sequence ${sequenceId}`)
  const out: string[] = []
  let item = 0
  const addImages = (): void => {
    if (item === 0) return
    while (out.length > 0 && out[out.length - 1].trim() === '') out.pop()
    for (const frame of sequence.frames.filter((f) => f.step === item)) {
      const src = asset(sequenceFramePath(sequence.id, frame.id))
      out.push('', `   ![${frame.alt}](${src})`)
    }
    out.push('')
  }
  for (const line of body.split('\n')) {
    if (/^\d+\. /.test(line)) {
      addImages()
      item += 1
    }
    out.push(line)
  }
  addImages()
  return out.join('\n').trim()
}

const RAW_ANCHOR = /<a id="([^"]+)" \/>/g

// A JSX tag: a capital, then a space, `/` or `>`. Not a `{ref}` label.
const JSX_TAG = /<([A-Z]\w*)(?=[\s/>])/

/**
 * Converts one page. `rawAnchors` maps each slug to its `<a id>` anchors:
 * a link to one becomes a `{ref}`, since MyST reaches it by label, not id.
 */
export const mdxToMyst = (
  mdx: string,
  slug: string,
  rawAnchors: ReadonlyMap<string, ReadonlySet<string>>,
): string => {
  const link = (text: string, target: string): string => {
    if (/^(https?:|mailto:)/.test(target)) return `[${text}](${target})`
    if (target === '/') return `[${text}](https://web.cytoscape.org)`
    if (target.startsWith('manual-assets/')) {
      return `[${text}](${asset(target)})`
    }
    const [page, anchor] = target.startsWith('#')
      ? [slug, target.slice(1)]
      : target.split('#')
    if (anchor !== undefined && rawAnchors.get(page)?.has(anchor)) {
      return `{ref}\`${text.replace(/[`<>]/g, '')} <${mystLabel(page, anchor)}>\``
    }
    if (target.startsWith('#')) return `[${text}](${target})`
    const hash = anchor === undefined ? '' : `#${anchor}`
    return `[${text}](${mystFileName(page)}.md${hash})`
  }

  let s = mdx
  s = s.replace(/<DemoOnly>[\s\S]*?<\/DemoOnly>\n*/g, '')
  s = s.replace(/<WithoutDemo>\n*([\s\S]*?)\n*<\/WithoutDemo>/g, '$1')
  s = s.replace(/<BrowserStorageView \/>\n*/g, '')
  // The raw anchor keeps old URLs working; the MyST label lets links reach it.
  s = s.replace(
    /<a id="([^"]+)" \/>\n*/g,
    (_m, id: string) => `<a id="${id}"></a>\n\n(${mystLabel(slug, id)})=\n`,
  )
  s = s.replace(
    /<Note(?: severity="(\w+)")?>\n*([\s\S]*?)\n*<\/Note>/g,
    (_m, severity: string | undefined, body: string) =>
      `\`\`\`\`{${severity === 'warning' ? 'warning' : 'note'}}\n${body}\n\`\`\`\``,
  )
  s = s.replace(/<Screenshot id="([^"]+)"[^>]*\/>/g, (_m, id: string) => {
    const recipe = findScreenshotRecipe(id)
    if (recipe === undefined) throw new Error(`Unknown screenshot ${id}`)
    return `![${recipe.alt}](${asset(screenshotPath(id))})`
  })
  s = s.replace(
    /<Steps sequence="([^"]+)">\n*([\s\S]*?)\n*<\/Steps>/g,
    (_m, id: string, body: string) => steps(id, body),
  )
  s = s.replace(
    /<VisualPropertyTable group="(node|edge|network)" \/>/g,
    (_m, group: VisualPropertyGroup) => propertyTable(group),
  )
  s = s.replace(/<UiIcon [^>]*\/>/g, icon)
  s = s.replace(
    /(!?)\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_m, bang: string, text: string, target: string) =>
      bang === '!' ? `![${text}](${asset(target)})` : link(text, target),
  )
  const left = JSX_TAG.exec(s)
  if (left !== null) throw new Error(`${slug}: unconverted <${left[1]}>`)
  return `${s.replace(/\n{3,}/g, '\n\n').trim()}\n`
}

/** Every page as `[file name, MyST]`, in page order (the toctree order). */
export const exportManualToMyst = (
  readPage: (slug: string) => string,
): Array<[string, string]> => {
  const mdx = new Map(MANUAL_PAGES.map((p) => [p.slug, readPage(p.slug)]))
  const rawAnchors = new Map(
    [...mdx].map(([slug, text]) => [
      slug,
      new Set([...text.matchAll(RAW_ANCHOR)].map((m) => m[1])),
    ]),
  )
  return MANUAL_PAGES.map((p) => [
    mystFileName(p.slug),
    mdxToMyst(mdx.get(p.slug)!, p.slug, rawAnchors),
  ])
}

/** `index.rst` with its numbered toctree listing `names`. */
export const withToctree = (
  index: string,
  names: readonly string[],
): string => {
  const toctree = /(:numbered: 2\n\n)((?: {3}\S.*\n)+)/
  if (!toctree.test(index)) throw new Error('No toctree found in index.rst')
  return index.replace(
    toctree,
    (_m, head: string) => `${head}${names.map((n) => `   ${n}\n`).join('')}`,
  )
}
