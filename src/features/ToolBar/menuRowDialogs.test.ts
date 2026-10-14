// @vitest-environment node
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

/**
 * No toolbar menu row may render a dialog (#784).
 *
 * A row is unmounted with its menu, and a dialog rendered inside it is a React
 * child of the menu but lives in its own DOM portal. The menu then has to guess
 * from focus, click and key events whether the dialog is still "inside" it, and
 * every wrong guess closes the menu and unmounts the dialog: fields that close
 * the dialog on click, a Confirm that does nothing. `DropdownMenu` no longer
 * makes those guesses at all. A dialog belongs to the menu component (or a
 * store), next to `<DropdownMenu>`; the row only calls `onClick`, which closes
 * the menu and opens the dialog.
 *
 * Lexical on purpose, like `src/components/dialogPolicy.test.ts`: every
 * `template: <Name` in a menu file is resolved through that file's imports,
 * and neither the component's file nor any module it renders or lazy-loads
 * (three levels deep) may render a dialog element.
 */

const SRC = path.resolve(__dirname, '../..')
const TOOLBAR = path.resolve(__dirname)

const DIALOG_ELEMENT = /<(?:CyDialog|Dialog|[A-Z]\w*Dialog|FileUpload)\b/

const menuFiles = (): string[] =>
  fs
    .readdirSync(TOOLBAR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(TOOLBAR, entry.name, 'index.tsx'))
    .filter((file) => fs.existsSync(file))

const resolveModule = (fromFile: string, specifier: string): string | null => {
  let base: string
  if (specifier.startsWith('@/')) {
    base = path.join(SRC, specifier.slice(2))
  } else if (specifier.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), specifier)
  } else {
    return null
  }
  const candidates = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    path.join(base, 'index.tsx'),
    path.join(base, 'index.ts'),
  ]
  return (
    candidates.find(
      (file) => fs.existsSync(file) && fs.statSync(file).isFile(),
    ) ?? null
  )
}

/** Local name → resolved file, for every static import in `file`. */
const importsOf = (file: string): Map<string, string> => {
  const source = fs.readFileSync(file, 'utf8')
  const imports = new Map<string, string>()
  const pattern =
    /import\s+(?:type\s+)?(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"]/g
  for (const [, defaultName, named, specifier] of source.matchAll(pattern)) {
    const resolved = resolveModule(file, specifier)
    if (resolved === null) continue
    if (defaultName !== undefined) imports.set(defaultName, resolved)
    for (const part of (named ?? '').split(',')) {
      const local = part
        .trim()
        .split(/\s+as\s+/)
        .pop()
      if (local) imports.set(local, resolved)
    }
  }
  return imports
}

/**
 * The component's own file plus, recursively, every local module it
 * lazy-loads or renders as JSX: a row that renders `<ExportImage>` owns the
 * `CyDialog` in `ExportImage.tsx` as much as one that renders it directly.
 */
const filesRenderedBy = (
  file: string,
  depth = 3,
  seen = new Set<string>(),
): string[] => {
  if (seen.has(file)) return []
  seen.add(file)
  if (depth === 0) return [file]
  const source = fs.readFileSync(file, 'utf8')
  const imports = importsOf(file)
  const lazyLoaded = [...source.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)]
    .map(([, specifier]) => resolveModule(file, specifier))
    .filter((resolved): resolved is string => resolved !== null)
  const rendered = [...source.matchAll(/<([A-Z]\w*)\b/g)]
    .map(([, component]) => imports.get(component))
    .filter((resolved): resolved is string => resolved !== undefined)
  return [
    file,
    ...[...new Set([...lazyLoaded, ...rendered])].flatMap((child) =>
      filesRenderedBy(child, depth - 1, seen),
    ),
  ]
}

interface TemplateRow {
  menu: string
  component: string
  file: string
}

const templateRows = (): TemplateRow[] =>
  menuFiles().flatMap((menu) => {
    const source = fs.readFileSync(menu, 'utf8')
    const imports = importsOf(menu)
    return [...source.matchAll(/template:\s*\(?\s*<(\w+)/g)].flatMap(
      ([, component]) => {
        const file = imports.get(component)
        return file === undefined
          ? []
          : [{ menu: path.relative(SRC, menu), component, file }]
      },
    )
  })

describe('toolbar menu rows', () => {
  it('finds the rows it checks', () => {
    // A guard on the guard: a broken parser would vacuously pass the rest.
    const rows = templateRows()
    expect(rows.length).toBeGreaterThanOrEqual(20)
    expect(rows.map((row) => row.component)).toContain('LoadFromNdexMenuItem')
  })

  it('recognises a dialog element', () => {
    expect(DIALOG_ELEMENT.test('<CyDialog open={open}>')).toBe(true)
    expect(DIALOG_ELEMENT.test('<WorkspaceNamingDialog')).toBe(true)
    expect(DIALOG_ELEMENT.test('<DropdownMenuItem label="x" />')).toBe(false)
  })

  it('never renders a dialog inside a row', () => {
    const offenders = templateRows().flatMap(({ menu, component, file }) => {
      const owner = filesRenderedBy(file).find((rendered) =>
        DIALOG_ELEMENT.test(fs.readFileSync(rendered, 'utf8')),
      )
      return owner === undefined
        ? []
        : [
            `${menu}: ${component} renders a dialog (${path.relative(SRC, owner)})`,
          ]
    })
    expect(offenders).toEqual([])
  })
})
