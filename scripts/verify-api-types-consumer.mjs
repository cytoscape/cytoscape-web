#!/usr/bin/env node
// Type-check the @cytoscape-web/api-types tarball as a consumer would.
//
// The size and substring checks in verify-api-types-pack.mjs are sanity checks,
// not proof that the declarations compile. Only a compiler settles that, and it
// has to run BEFORE the publish: a broken 1.0.0-beta.4 cannot be replaced, only
// superseded by 1.0.0-beta.5.
//
// The fixture is copied OUT of the repository first. Measured from
// test/fixtures/api-types-consumer/, resolution walks up and finds
// <repo>/node_modules/react, <repo>/node_modules/@types/react,
// <repo>/node_modules/typescript — and, worst of all,
// @cytoscape-web/api-types resolves to <repo>/packages/api-types/dist via the
// workspace symlink, so an in-place check would type-check the local build no
// matter what the tarball contains.

import { execFileSync } from 'node:child_process'
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const FIXTURE = 'test/fixtures/api-types-consumer'
const PKG_DIR = 'packages/api-types'

const fail = (message) => {
  console.error(`verify-api-types-consumer: ${message}`)
  process.exit(1)
}

const parseArgs = (argv) => {
  const options = { keep: false }
  for (const arg of argv) {
    if (arg === '--keep') options.keep = true
    else if (arg.startsWith('--')) fail(`unknown argument ${arg}`)
    else options.tarball = arg
  }
  return options
}

const packTarball = () => {
  // --ignore-scripts: prepack would rebuild, and its tsup output on stdout
  // breaks --json parsing. Requires a prior `npm run build:api-types`.
  const output = execFileSync(
    'npm',
    ['pack', '-w', PKG_DIR, '--ignore-scripts', '--json', '--silent'],
    { encoding: 'utf8' },
  )
  return resolve(JSON.parse(output)[0].filename)
}

const main = () => {
  const options = parseArgs(process.argv.slice(2))

  const tarball = options.tarball ? resolve(options.tarball) : packTarball()
  try {
    statSync(tarball)
  } catch {
    fail(`no such tarball: ${tarball}`)
  }

  // mkdtemp in the OS temp dir, not under the repo: the whole point is to sit
  // outside any node_modules this repository owns.
  const scratch = mkdtempSync(join(tmpdir(), 'api-types-consumer-'))
  try {
    cpSync(FIXTURE, scratch, { recursive: true })

    // Point the fixture at the tarball. A file: specifier installs the real
    // packed artifact rather than linking the workspace.
    const manifestPath = join(scratch, 'package.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    manifest.devDependencies = {
      ...manifest.devDependencies,
      '@cytoscape-web/api-types': `file:${tarball}`,
    }
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

    console.log(`fixture   ${scratch}`)
    console.log(`tarball   ${tarball}`)

    // --ignore-scripts: `npm install` would otherwise run lifecycle scripts
    // from the tarball and from every dependency it pulls, as this account,
    // during a release. Nothing here needs them — the fixture wants type
    // declarations and the tsc binary, both of which ship prebuilt — so the
    // capability is pure downside.
    execFileSync(
      'npm',
      ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--silent'],
      {
        cwd: scratch,
        stdio: 'inherit',
      },
    )

    // Resolve tsc from the fixture's own install, so the pinned version is the
    // one that runs.
    execFileSync(
      process.execPath,
      [join(scratch, 'node_modules/typescript/bin/tsc'), '--noEmit'],
      {
        cwd: scratch,
        stdio: 'inherit',
      },
    )

    console.log('consumer type-check passed (skipLibCheck: false)')
  } catch (error) {
    if (options.keep) console.error(`fixture kept at ${scratch}`)
    fail(
      'the published declarations do not compile for a consumer\n' +
        `  ${error.message}`,
    )
  } finally {
    if (!options.keep) rmSync(scratch, { recursive: true, force: true })
  }
}

main()
