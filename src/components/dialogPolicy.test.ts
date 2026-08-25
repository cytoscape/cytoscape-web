// @vitest-environment node
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

/**
 * Keeps `docs/specifications/DIALOG_DISMISS_POLICY.md` honest about the code.
 *
 * `blocking` is the one tier a user cannot escape, so the policy names every
 * dialog allowed to use it. Nothing else pins the doc to reality — TypeScript
 * only checks that a tier is present, not that a `blocking` one was argued for.
 * Adding a blocking dialog without a row in the exemption table fails here, as
 * does leaving a row behind after a dialog changes tier or is deleted.
 */

const SRC = path.resolve(__dirname, '..')
const POLICY = path.resolve(
  __dirname,
  '../../docs/specifications/DIALOG_DISMISS_POLICY.md',
)

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return entry.name.endsWith('.tsx') && !entry.name.includes('.spec.')
      ? [full]
      : []
  })

/** Paths of every source file that renders a `blocking` dialog, `src/`-rooted. */
const blockingDialogFiles = (): string[] =>
  walk(SRC)
    .filter((file) =>
      fs.readFileSync(file, 'utf8').includes('dismiss="blocking"'),
    )
    .map((file) => path.relative(SRC, file))

/** The `.tsx` paths named in the "Blocking exemptions" section, that section only. */
const exemptedInPolicy = (): string[] => {
  const policy = fs.readFileSync(POLICY, 'utf8')
  const start = policy.indexOf('## Blocking exemptions')
  expect(start).toBeGreaterThan(-1)
  const rest = policy.slice(start + 1)
  const end = rest.indexOf('\n## ')
  const section = end === -1 ? rest : rest.slice(0, end)
  return [...section.matchAll(/`([\w/-]+\.tsx)`/g)].map((match) => match[1])
}

describe('dialog dismissal policy', () => {
  it('documents every blocking dialog in the exemption table', () => {
    const exempted = exemptedInPolicy()
    const undocumented = blockingDialogFiles().filter(
      (file) => !exempted.some((listed) => file.endsWith(listed)),
    )
    expect(undocumented).toEqual([])
  })

  it('lists no exemption that no longer uses the blocking tier', () => {
    const exempted = exemptedInPolicy()
    expect(exempted.length).toBeGreaterThan(0)

    const actual = blockingDialogFiles()
    const stale = exempted.filter(
      (listed) => !actual.some((file) => file.endsWith(listed)),
    )
    expect(stale).toEqual([])
  })
})
