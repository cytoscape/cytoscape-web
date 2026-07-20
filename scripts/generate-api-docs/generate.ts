/**
 * Orchestrator for the CyWeb App API docs site.
 *
 * Parses the four in-repo sources, merges the TypeScript-extracted surface
 * signatures into the Api.md reference (and cross-checks the two for drift),
 * assembles the `docs-data` payload, and injects it into template.html to
 * produce the self-contained docs-site/index.html.
 *
 *   ts-node generate.ts [--strict]
 *
 * --strict makes any Api.md ↔ TS-surface drift a nonzero exit.
 */
import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { parseApiMd } from './parse-api-md'
import { parseChangelog } from './parse-changelog'
import { parseErrorCodes } from './parse-error-codes'
import { extractSurface } from './extract-surface'
import type { DocsData, Surface } from './types'

const REPO_ROOT = path.resolve(__dirname, '../..')
const HERE = __dirname
const CHANGELOG = path.join(REPO_ROOT, 'packages/api-types/CHANGELOG.md')
const API_MD = path.join(REPO_ROOT, 'src/app-api/api_docs/Api.md')
const ERROR_MD = path.join(REPO_ROOT, 'src/app-api/api_docs/ErrorCodes.md')
const SURFACES_DIR = path.join(HERE, 'surfaces')
const TEMPLATE = path.join(HERE, 'template.html')
const OUT = path.join(REPO_ROOT, 'docs-site/index.html')

const read = (p: string): string => fs.readFileSync(p, 'utf8')

function git(args: string[]): string {
  try {
    return execFileSync('git', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim()
  } catch {
    return ''
  }
}

function pkgVersion(): string {
  const pkg = JSON.parse(
    read(path.join(REPO_ROOT, 'packages/api-types/package.json')),
  )
  return pkg.version as string
}

/** Load committed snapshots, then overlay a live HEAD extraction for the
 *  current version so the reference + drift check track the working tree. */
function loadSurfaces(currentVersion: string): {
  surfaces: Record<string, Surface>
  order: string[]
} {
  const surfaces: Record<string, Surface> = {}
  const order: string[] = []
  const indexPath = path.join(SURFACES_DIR, 'versions.json')
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(read(indexPath)) as Array<{ version: string }>
    for (const { version } of index) {
      const file = path.join(SURFACES_DIR, `${version}.json`)
      if (fs.existsSync(file)) {
        surfaces[version] = JSON.parse(read(file)) as Surface
        order.push(version)
      }
    }
  }
  // Live-refresh the current version from the working tree.
  const live = extractSurface(null, currentVersion)
  live.commit = git(['rev-parse', '--short', 'HEAD']) || 'HEAD'
  surfaces[currentVersion] = live
  if (!order.includes(currentVersion)) order.unshift(currentVersion)
  return { surfaces, order }
}

/** Merge TS signatures into the reference and report drift. */
function mergeSurfaceAndCheckDrift(data: DocsData, latest: Surface): string[] {
  const warnings: string[] = []
  const docKeys = new Set<string>()

  for (const ns of data.namespaces) {
    const surfaceNs = latest.namespaces[ns.key]
    const surfaceMethods = surfaceNs ? surfaceNs.methods : {}
    for (const group of ns.groups) {
      for (const method of group.methods) {
        docKeys.add(`${ns.key}.${method.name}`)
        const sm = surfaceMethods[method.name]
        if (sm) method.tsSignature = sm.signature
        else
          warnings.push(
            `Api.md documents ${ns.key}.${method.name} but the TS surface has no such method`,
          )
      }
    }
  }

  for (const [key, ns] of Object.entries(latest.namespaces)) {
    for (const name of Object.keys(ns.methods)) {
      if (!docKeys.has(`${key}.${name}`)) {
        warnings.push(
          `TS surface exposes ${key}.${name} but Api.md does not document it`,
        )
      }
    }
  }

  return warnings
}

function main(): void {
  const strict = process.argv.includes('--strict')
  const version = pkgVersion()

  const versions = parseChangelog(read(CHANGELOG))
  const { namespaces, guides } = parseApiMd(read(API_MD))
  const errorCodes = parseErrorCodes(read(ERROR_MD))
  const { surfaces, order } = loadSurfaces(version)

  const methodCount = namespaces.reduce(
    (n, ns) => n + ns.groups.reduce((m, g) => m + g.methods.length, 0),
    0,
  )

  const data: DocsData = {
    meta: {
      generatedAt: new Date().toISOString(),
      apiTypesVersion: version,
      methodCount,
      namespaceCount: namespaces.length,
      errorCodeCount: errorCodes.length,
      surfaceVersions: order,
      commit: git(['rev-parse', '--short', 'HEAD']) || 'unknown',
      branch: git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown',
    },
    versions,
    namespaces,
    guides,
    surfaces,
    errorCodes,
  }

  const warnings = mergeSurfaceAndCheckDrift(data, surfaces[version])

  console.log('CyWeb App API docs')
  console.log(`  api-types version : ${version}`)
  console.log(`  changelog versions: ${versions.length}`)
  console.log(`  namespaces        : ${namespaces.length}`)
  console.log(`  reference methods : ${methodCount}`)
  console.log(`  error codes       : ${errorCodes.length}`)
  console.log(`  surface snapshots : ${order.length} (${order.join(', ')})`)
  console.log(`  guides            : ${guides.length}`)
  if (warnings.length) {
    console.log(`\n  ⚠ ${warnings.length} drift warning(s):`)
    for (const w of warnings) console.log(`    - ${w}`)
  } else {
    console.log('  drift check       : clean ✓')
  }

  if (!fs.existsSync(TEMPLATE)) {
    console.error(`\nTemplate not found: ${TEMPLATE}`)
    process.exit(1)
  }
  const template = read(TEMPLATE)
  const payload = JSON.stringify(data).replace(/</g, '\\u003c')
  if (!template.includes('__DATA__')) {
    console.error('\nTemplate is missing the __DATA__ placeholder')
    process.exit(1)
  }
  // Function replacement avoids `$&`/`$1` interpretation of `$` in the JSON.
  const html = template.replace('__DATA__', () => payload)
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, html)
  console.log(
    `\nwrote ${path.relative(REPO_ROOT, OUT)} (${(html.length / 1024).toFixed(0)} KB)`,
  )

  if (strict && warnings.length) {
    console.error('\n--strict: failing on drift warnings')
    process.exit(1)
  }
}

main()
