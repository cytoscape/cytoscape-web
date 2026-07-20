/**
 * Extract the public API surface (method signatures per namespace interface)
 * using ts-morph. Purely syntactic — no type resolution — so it works on
 * arbitrary historical commits whose imports would not resolve.
 *
 * Two modes:
 *   - working tree (default): reads files under src/app-api directly.
 *   - `--at <commit>`: loads every src/app-api/*.ts via `git show`, so no
 *     checkout or dirty tree is needed.
 *
 * CLI:
 *   ts-node extract-surface.ts --at <commit> --version <label> --out <path>
 *   ts-node extract-surface.ts                       # HEAD working tree → stdout
 */
import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { Project, SyntaxKind } from 'ts-morph'
import type { Node } from 'ts-morph'
import type { Surface, SurfaceMethod, SurfaceNamespace } from './types'

const REPO_ROOT = path.resolve(__dirname, '../..')

/** Surface key → interface name. Order defines display order downstream. */
export const NAMESPACE_INTERFACES: Array<{
  key: string
  interfaceName: string
}> = [
  { key: 'element', interfaceName: 'ElementApi' },
  { key: 'network', interfaceName: 'NetworkApi' },
  { key: 'selection', interfaceName: 'SelectionApi' },
  { key: 'viewport', interfaceName: 'ViewportApi' },
  { key: 'table', interfaceName: 'TableApi' },
  { key: 'visualStyle', interfaceName: 'VisualStyleApi' },
  { key: 'layout', interfaceName: 'LayoutApi' },
  { key: 'export', interfaceName: 'ExportApi' },
  { key: 'workspace', interfaceName: 'WorkspaceApi' },
  { key: 'contextMenu', interfaceName: 'ContextMenuApi' },
  { key: 'resource', interfaceName: 'ResourceApi' },
]

function git(args: string[]): string {
  return execFileSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
}

/** Map of repo-relative path → file text for all *.ts under src/app-api. */
function loadAppApiFiles(commit: string | null): Record<string, string> {
  const files: Record<string, string> = {}
  if (commit === null) {
    const dir = path.join(REPO_ROOT, 'src/app-api')
    const walk = (d: string): void => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (
          /\.tsx?$/.test(entry.name) &&
          !/\.(test|spec)\./.test(entry.name)
        ) {
          files[path.relative(REPO_ROOT, full)] = fs.readFileSync(full, 'utf8')
        }
      }
    }
    walk(dir)
  } else {
    const list = git([
      'ls-tree',
      '-r',
      '--name-only',
      commit,
      '--',
      'src/app-api',
    ])
      .split('\n')
      .filter((p) => /\.tsx?$/.test(p) && !/\.(test|spec)\./.test(p))
    for (const rel of list) {
      try {
        files[rel] = git(['show', `${commit}:${rel}`])
      } catch {
        // File unreadable at this commit — skip.
      }
    }
  }
  return files
}

function normalizeType(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function jsdocText(node: Node): string | null {
  const withDocs = node as unknown as {
    getJsDocs?: () => Array<{ getDescription(): string }>
  }
  if (typeof withDocs.getJsDocs !== 'function') return null
  const docs = withDocs.getJsDocs()
  if (!docs.length) return null
  const desc = docs
    .map((d) => d.getDescription().trim())
    .filter(Boolean)
    .join('\n\n')
    .trim()
  return desc || null
}

function extractMethod(name: string, node: Node): SurfaceMethod | null {
  const kind = node.getKind()
  let params: Array<{ name: string; type: string; optional: boolean }> = []
  let returnType = 'void'

  if (kind === SyntaxKind.MethodSignature) {
    const m = node.asKindOrThrow(SyntaxKind.MethodSignature)
    params = m.getParameters().map((p) => ({
      name: p.getName(),
      type: normalizeType(p.getTypeNode()?.getText() ?? 'any'),
      optional:
        p.hasQuestionToken() || p.isRestParameter() || p.hasInitializer(),
    }))
    returnType = normalizeType(m.getReturnTypeNode()?.getText() ?? 'void')
  } else if (kind === SyntaxKind.PropertySignature) {
    const p = node.asKindOrThrow(SyntaxKind.PropertySignature)
    const typeNode = p.getTypeNode()
    if (!typeNode || typeNode.getKind() !== SyntaxKind.FunctionType) return null
    const fn = typeNode.asKindOrThrow(SyntaxKind.FunctionType)
    params = fn.getParameters().map((pp) => ({
      name: pp.getName(),
      type: normalizeType(pp.getTypeNode()?.getText() ?? 'any'),
      optional: pp.hasQuestionToken() || pp.isRestParameter(),
    }))
    returnType = normalizeType(fn.getReturnTypeNode()?.getText() ?? 'void')
  } else {
    return null
  }

  const sigParams = params
    .map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
    .join(', ')
  return {
    name,
    params,
    returnType,
    signature: `${name}(${sigParams}): ${returnType}`,
    jsdoc: jsdocText(node),
  }
}

export function extractSurface(
  commit: string | null,
  version: string,
): Surface {
  const files = loadAppApiFiles(commit)
  const project = new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: false },
  })
  for (const [rel, text] of Object.entries(files)) {
    project.createSourceFile(rel, text, { overwrite: true })
  }

  const namespaces: Record<string, SurfaceNamespace> = {}
  for (const { key, interfaceName } of NAMESPACE_INTERFACES) {
    let iface = null as ReturnType<
      ReturnType<Project['getSourceFiles']>[number]['getInterface']
    > | null
    for (const sf of project.getSourceFiles()) {
      const found = sf.getInterface(interfaceName)
      if (found && found.isExported()) {
        iface = found
        break
      }
    }
    if (!iface) continue

    const methods: Record<string, SurfaceMethod> = {}
    for (const member of iface.getMembers()) {
      const mk = member.getKind()
      if (
        mk !== SyntaxKind.MethodSignature &&
        mk !== SyntaxKind.PropertySignature
      )
        continue
      const nameNode = (member as unknown as { getName?: () => string }).getName
      if (typeof nameNode !== 'function') continue
      const name = nameNode.call(member)
      const method = extractMethod(name, member)
      if (method) methods[name] = method
    }
    namespaces[key] = { interfaceName, methods }
  }

  return {
    version,
    commit: commit ?? 'HEAD',
    namespaces,
  }
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        out[key] = next
        i++
      } else {
        out[key] = 'true'
      }
    }
  }
  return out
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2))
  const commit = args.at && args.at !== 'HEAD' ? args.at : null
  const version = args.version || 'HEAD'
  const surface = extractSurface(commit, version)
  const json = JSON.stringify(surface, null, 2)
  if (args.out) {
    fs.mkdirSync(path.dirname(path.resolve(REPO_ROOT, args.out)), {
      recursive: true,
    })
    fs.writeFileSync(path.resolve(REPO_ROOT, args.out), json + '\n')
    const total = Object.values(surface.namespaces).reduce(
      (n, ns) => n + Object.keys(ns.methods).length,
      0,
    )
    console.log(
      `wrote ${args.out} — ${version} @ ${surface.commit}: ${
        Object.keys(surface.namespaces).length
      } namespaces, ${total} methods`,
    )
  } else {
    process.stdout.write(json + '\n')
  }
}
