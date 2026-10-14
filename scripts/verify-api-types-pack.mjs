#!/usr/bin/env node
// Verify the @cytoscape-web/api-types tarball that is about to be published.
//
// Operates on a REAL .tgz, never `npm pack --dry-run`: `prepack` fires on a dry
// run too, so a dry-run check would rebuild the very thing it was meant to
// inspect and the bytes verified would not be the bytes published. Two further
// consequences of that, both measured:
//   - when scripts run, tsup writes "CLI Building entry:" to stdout, so
//     `npm pack --json` cannot be parsed at all
//   - an explicit build followed by a plain pack builds twice
// Hence --ignore-scripts whenever this script packs for itself.
//
// The tarball is extracted and asserted against the EXTRACTED TREE, so the
// checks read exactly what a consumer installs.

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'

const PKG_DIR = 'packages/api-types'

// Exactly what the tarball must contain. If a change here is intentional,
// update this list in the same commit as the `files` field it mirrors.
const EXPECTED = [
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'dist/index.d.ts',
  'dist/mf-declarations.d.ts',
  'index.d.ts',
  'package.json',
]

const MIN_DTS_BYTES = 10_000
const DTS_FIRST_LINE = '/// <reference path="./mf-declarations.d.ts" />'

const fail = (message) => {
  console.error(`verify-api-types-pack: ${message}`)
  process.exit(1)
}

const parseArgs = (argv) => {
  const options = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--out') options.out = argv[(i += 1)]
    else if (arg.startsWith('--')) fail(`unknown argument ${arg}`)
    else options.tarball = arg
  }
  return options
}

const packTarball = () => {
  // --ignore-scripts: see the header. Requires a prior `npm run build:api-types`.
  const output = execFileSync(
    'npm',
    ['pack', '-w', PKG_DIR, '--ignore-scripts', '--json', '--silent'],
    { encoding: 'utf8' },
  )
  const name = JSON.parse(output)[0].filename
  return resolve(name)
}

const listFiles = (root) => {
  const found = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else found.push(relative(root, full).split('\\').join('/'))
    }
  }
  walk(root)
  return found.sort()
}

const main = async () => {
  const options = parseArgs(process.argv.slice(2))

  const tarball = options.tarball ? resolve(options.tarball) : packTarball()
  try {
    statSync(tarball)
  } catch {
    fail(`no such tarball: ${tarball}`)
  }

  const scratch = mkdtempSync(join(tmpdir(), 'api-types-pack-'))
  try {
    await mkdir(scratch, { recursive: true })
    execFileSync('tar', ['-xzf', tarball, '-C', scratch])
    // npm tarballs put everything under package/
    const root = join(scratch, 'package')

    const actual = listFiles(root)
    const missing = EXPECTED.filter((f) => !actual.includes(f))
    const unexpected = actual.filter((f) => !EXPECTED.includes(f))
    if (missing.length > 0 || unexpected.length > 0) {
      const lines = ['tarball contents do not match the expected list']
      if (missing.length > 0) lines.push(`  missing:    ${missing.join(', ')}`)
      if (unexpected.length > 0)
        lines.push(`  unexpected: ${unexpected.join(', ')}`)
      lines.push(
        `  If this change is intentional, update EXPECTED in ${relative(process.cwd(), new URL(import.meta.url).pathname)}`,
        `  and the "files" array in ${PKG_DIR}/package.json together.`,
      )
      fail(lines.join('\n'))
    }
    if (actual.length !== EXPECTED.length) {
      fail(`expected ${EXPECTED.length} entries, found ${actual.length}`)
    }

    const declared = JSON.parse(
      readFileSync(join(PKG_DIR, 'package.json'), 'utf8'),
    ).version
    const packed = JSON.parse(
      readFileSync(join(root, 'package.json'), 'utf8'),
    ).version
    if (packed !== declared) {
      fail(`tarball says ${packed}, ${PKG_DIR}/package.json says ${declared}`)
    }

    const dts = readFileSync(join(root, 'dist/index.d.ts'), 'utf8')
    if (Buffer.byteLength(dts) < MIN_DTS_BYTES) {
      fail(
        `dist/index.d.ts is ${Buffer.byteLength(dts)} bytes, expected more than ${MIN_DTS_BYTES}\n` +
          '  An empty or stub declaration file is the characteristic tsup failure.',
      )
    }
    if (dts.split(/\r?\n/, 1)[0] !== DTS_FIRST_LINE) {
      fail(
        `dist/index.d.ts does not start with the mf-declarations reference\n` +
          `  expected: ${DTS_FIRST_LINE}\n` +
          '  The postbuild step uses relative paths; this is what it looks like when it ran from the wrong cwd.',
      )
    }

    const packedMf = readFileSync(join(root, 'dist/mf-declarations.d.ts'))
    const sourceMf = readFileSync(join(PKG_DIR, 'src/mf-declarations.d.ts'))
    if (!packedMf.equals(sourceMf)) {
      fail(
        'dist/mf-declarations.d.ts differs from src/mf-declarations.d.ts — postbuild did not copy the current file',
      )
    }

    const bytes = readFileSync(tarball)
    const result = {
      version: packed,
      shasum: createHash('sha1').update(bytes).digest('hex'),
      integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
      tarball,
    }

    if (options.out)
      writeFileSync(options.out, `${JSON.stringify(result, null, 2)}\n`)
    if (process.env.GITHUB_OUTPUT) {
      writeFileSync(
        process.env.GITHUB_OUTPUT,
        `version=${result.version}\nshasum=${result.shasum}\nintegrity=${result.integrity}\ntarball=${result.tarball}\n`,
        { flag: 'a' },
      )
    }

    console.log(
      `${JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name}@${result.version}`,
    )
    console.log(`  entries   ${actual.length}`)
    console.log(`  shasum    ${result.shasum}`)
    console.log(`  integrity ${result.integrity}`)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

await main()
