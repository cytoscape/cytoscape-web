#!/usr/bin/env node
// Decide whether to publish, skip, or stop — given what the registry already
// holds and the tarball this run produced.
//
// Runs AFTER the build, not with the pre-build guards: the decision compares
// the registry against this run's artifact, which does not exist at guard time.
//
// A flat "the version must not exist" guard makes a partial failure
// unrecoverable. npm publishes are not idempotent but everything after them is,
// so if the registry accepts the package and only the read-back fails, the tag
// can be neither re-run nor re-tagged — the version is taken and npm versions
// are immutable. Hence `skip`: resume at verification instead of refusing.
//
// Skipping is only safe when the published artifact is THIS artifact. That
// means integrity AND provenance, and provenance down to the commit: a publish
// from this same workflow at a different commit would otherwise read as
// "already done" and the run would resume onto someone else's bytes.
//
// Outputs `action` (publish | skip) to GITHUB_OUTPUT. "Stop" is a non-zero exit.

import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import semver from 'semver'

const SLSA_PREDICATE = 'https://slsa.dev/provenance/v1'

const fail = (message) => {
  console.error(`decide-registry-action: ${message}`)
  process.exit(1)
}

const parseArgs = (argv) => {
  const options = { dryRun: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--package') options.pkg = argv[(i += 1)]
    else if (arg === '--version') options.version = argv[(i += 1)]
    else if (arg === '--integrity') options.integrity = argv[(i += 1)]
    else if (arg === '--repository') options.repository = argv[(i += 1)]
    else if (arg === '--workflow') options.workflow = argv[(i += 1)]
    else if (arg === '--sha') options.sha = argv[(i += 1)]
    else if (arg === '--dist-tag') options.distTag = argv[(i += 1)]
    else if (arg === '--dry-run') options.dryRun = true
    else fail(`unknown argument ${arg}`)
  }
  for (const key of [
    'pkg',
    'version',
    'integrity',
    'repository',
    'workflow',
    'sha',
    'distTag',
  ]) {
    if (!options[key]) fail(`--${key} is required`)
  }
  return options
}

/**
 * The registry's record for one version.
 * @returns {{ state: 'absent' } | { state: 'present', manifest: object }}
 *
 * Only E404 means "not published". A network failure, an auth error or a
 * registry outage also exit non-zero, and reading those as permission to
 * publish is how a run proceeds on a false premise.
 */
const readVersion = (pkg, version) => {
  let stdout = ''
  try {
    stdout = execFileSync('npm', ['view', `${pkg}@${version}`, '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    const raw = error.stdout ?? ''
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      fail(
        `npm view failed and produced no JSON — treating this as "not published" would be a guess\n` +
          `  ${(error.stderr ?? error.message).toString().trim().split('\n')[0]}`,
      )
    }
    if (parsed?.error?.code === 'E404') return { state: 'absent' }
    fail(
      `npm view failed with ${parsed?.error?.code ?? 'an unknown error'}, which is not E404\n` +
        `  ${parsed?.error?.summary ?? ''}\n` +
        '  Only a 404 means the version is unpublished. Fix the registry access and re-run.',
    )
  }
  return { state: 'present', manifest: JSON.parse(stdout) }
}

/** The SLSA provenance predicate for a published version, or null. */
const readProvenance = async (manifest) => {
  const url = manifest?.dist?.attestations?.url
  if (!url) return null

  const response = await fetch(url)
  if (!response.ok)
    fail(`could not fetch attestations: ${url} returned ${response.status}`)
  const body = await response.json()

  for (const attestation of body.attestations ?? []) {
    const payload = attestation?.bundle?.dsseEnvelope?.payload
    if (!payload) continue
    const statement = JSON.parse(
      Buffer.from(payload, 'base64').toString('utf8'),
    )
    if (statement.predicateType !== SLSA_PREDICATE) continue

    const build = statement.predicate?.buildDefinition ?? {}
    return {
      repository: build.externalParameters?.workflow?.repository,
      workflow: build.externalParameters?.workflow?.path,
      commit: build.resolvedDependencies?.[0]?.digest?.gitCommit,
    }
  }
  return null
}

/**
 * Refuse to move a dist-tag backwards onto an older release.
 *
 * Fails CLOSED, for the same reason readVersion does: an auth error, a
 * registry outage or a timeout also exit non-zero, and swallowing those would
 * treat "cannot tell" as "the tag does not exist". If the exact-version lookup
 * then succeeded after a transient failure, this guard would wave through
 * exactly the rollback it exists to prevent.
 */
const checkDistTag = (pkg, distTag, version) => {
  let current
  try {
    // `version --json` and not a bare `--json`: without the field, npm returns
    // the whole manifest and the parsed result is an object, which silently
    // skipped this guard when it was first written.
    current = execFileSync('npm', ['view', `${pkg}@${distTag}`, 'version', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    const raw = error.stdout ?? ''
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      fail(
        'could not read the current dist-tag, and the failure produced no JSON\n' +
          `  ${(error.stderr ?? error.message).toString().trim().split('\n')[0]}\n` +
          '  Treating this as "the tag does not exist" could roll the tag backwards.',
      )
    }
    if (parsed?.error?.code === 'E404') {
      // The tag genuinely does not exist yet. Publishing is what creates it.
      console.log(`  dist-tag ${distTag} does not exist yet`)
      return
    }
    fail(
      `could not read the current dist-tag: ${parsed?.error?.code ?? 'unknown error'}\n` +
        `  ${parsed?.error?.summary ?? ''}\n` +
        '  Only a 404 means the tag is unset. Fix the registry access and re-run.',
    )
  }

  current = JSON.parse(current)
  if (typeof current !== 'string' || current === '' || current === version) return

  if (
    semver.valid(current) &&
    semver.valid(version) &&
    semver.gt(current, version)
  ) {
    fail(
      `dist-tag "${distTag}" already points at ${current}, which is newer than ${version}\n` +
        '  Publishing would roll it backwards. Release a newer version instead.',
    )
  }
  console.log(
    `  dist-tag ${distTag} currently ${current} — moving it to ${version} is not a rollback`,
  )
}

const main = async () => {
  const options = parseArgs(process.argv.slice(2))
  const emit = (action) => {
    console.log(`action=${action}`)
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, `action=${action}\n`)
    }
  }

  checkDistTag(options.pkg, options.distTag, options.version)

  const found = readVersion(options.pkg, options.version)
  if (found.state === 'absent') {
    console.log(
      `${options.pkg}@${options.version} is not on the registry — publish`,
    )
    return emit('publish')
  }

  const published = found.manifest.dist?.integrity
  const sameBytes = published === options.integrity

  if (options.dryRun) {
    console.warn(
      `::warning::${options.pkg}@${options.version} is already published` +
        `${sameBytes ? ' with identical bytes' : ' with DIFFERENT bytes'} (dry run — continuing)`,
    )
    return emit('skip')
  }

  if (!sameBytes) {
    fail(
      `${options.pkg}@${options.version} is already published with different content\n` +
        `  registry: ${published}\n` +
        `  this run: ${options.integrity}\n` +
        '  npm versions are immutable. Release a new version; do not try to overwrite this one.',
    )
  }

  const provenance = await readProvenance(found.manifest)
  if (provenance === null) {
    fail(
      `${options.pkg}@${options.version} is already published with matching bytes but no provenance\n` +
        '  This run cannot confirm it published that artifact. A human must check before resuming.',
    )
  }

  const expectedRepo = `https://github.com/${options.repository}`
  const mismatches = []
  if (provenance.repository !== expectedRepo) {
    mismatches.push(`repository: ${provenance.repository} != ${expectedRepo}`)
  }
  if (provenance.workflow !== options.workflow) {
    mismatches.push(`workflow: ${provenance.workflow} != ${options.workflow}`)
  }
  if (provenance.commit !== options.sha) {
    mismatches.push(`commit: ${provenance.commit} != ${options.sha}`)
  }

  if (mismatches.length > 0) {
    fail(
      `${options.pkg}@${options.version} was published by something else\n` +
        mismatches.map((m) => `  ${m}`).join('\n') +
        '\n  Resuming here would adopt an artifact this run did not produce.',
    )
  }

  console.log(
    `${options.pkg}@${options.version} was already published by this workflow at this commit — skip the publish and resume at verification`,
  )
  emit('skip')
}

await main()
