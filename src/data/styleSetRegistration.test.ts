// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Guard for the named-style set surviving every CX2 boundary.
 *
 * `createCyNetworkFromCx2` always populates `CyNetwork.visualStyleSet`, and
 * `useVisualStyleStore.add(networkId, visualStyle, styleSet?)` takes it as an
 * OPTIONAL third argument — omitting it silently mints a fresh single-style set
 * named "Default" (MULTIPLE_VISUAL_STYLES.md §2). So a path that converts a CX2
 * and then registers the style without passing the set loses every named style
 * in the document, with no error and no failing type check.
 *
 * That is not hypothetical. Five paths shipped with the bug: importing a local
 * CX2 file, the `?import=` deep link, ServiceApps' addNetworks, and — on the
 * export side — `useCloneNetwork`, which round-trips a network through CX2 and
 * so needs the set on the way OUT too or the copy arrives with one style.
 *
 * The rules are textual on purpose. The type system cannot express them: every
 * argument involved is optional by design, because re-registration
 * (`CyjsRenderer`) legitimately omits the set to preserve the existing one.
 */

const SRC = join(__dirname, '..')

const collect = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      collect(full, out)
    } else if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

/** Produces a CyNetwork from CX2 — anything downstream may need the set. */
const CX2_TO_CY_NETWORK =
  /\b(createCyNetworkFromCx2|getCyNetworkFromCx2|fetchUrlCx)\s*\(/

/** Consumes a CyNetwork into CX2 — the set has to be supplied by the caller. */
const CY_NETWORK_TO_CX2 = /\bexportCyNetworkToCx2\s*\(/

/**
 * Names the active style alone. `\b` after the name keeps `visualStyleSet` and
 * `visualStyleOptions` from matching.
 */
const ACTIVE_STYLE_ONLY = /\bvisualStyle\b/

const CARRIES_STYLE_SET = /\bvisualStyleSet\b/

/**
 * Paths that handle the active style without the set, for a stated reason.
 *
 * `updateNetwork` re-registers a network the user already owns. A service
 * returns plain CX2, so its set is a single "Default" built from the standard
 * aspects; passing it would delete the user's named styles. Omitting it keeps
 * the existing set and replaces only the active style's content.
 *
 * Add an entry only with a reason, and only when the omission is deliberate.
 */
const DELIBERATE_OMISSIONS = new Set([
  'features/ServiceApps/resultHandler/updateNetwork.ts',
])

const sources = collect(SRC).map((file) => ({
  path: relative(SRC, file).split('\\').join('/'),
  text: readFileSync(file, 'utf8'),
}))

describe('named visual style sets survive the CX2 boundary', () => {
  it('finds the CX2 conversion and export sites it is guarding', () => {
    // A rename that silently emptied both rules would make every assertion
    // below vacuously pass.
    expect(
      sources.filter(({ text }) => CX2_TO_CY_NETWORK.test(text)).length,
    ).toBeGreaterThan(3)
    expect(
      sources.filter(({ text }) => CY_NETWORK_TO_CX2.test(text)).length,
    ).toBeGreaterThan(3)
  })

  it('carries the style set wherever a CX2 becomes a registered network', () => {
    const dropped = sources
      .filter(
        ({ path, text }) =>
          CX2_TO_CY_NETWORK.test(text) &&
          ACTIVE_STYLE_ONLY.test(text) &&
          !CARRIES_STYLE_SET.test(text) &&
          !DELIBERATE_OMISSIONS.has(path),
      )
      .map(({ path }) => path)

    expect(dropped).toEqual([])
  })

  it('carries the style set wherever a network becomes CX2', () => {
    const dropped = sources
      .filter(
        ({ text }) =>
          CY_NETWORK_TO_CX2.test(text) && !CARRIES_STYLE_SET.test(text),
      )
      .map(({ path }) => path)

    expect(dropped).toEqual([])
  })

  it('keeps every deliberate omission real', () => {
    // A stale allowlist entry is a hole: the file could stop handling styles
    // entirely, or start carrying the set, and the exemption would linger.
    const stale = [...DELIBERATE_OMISSIONS].filter((path) => {
      const source = sources.find((entry) => entry.path === path)
      return (
        source === undefined ||
        !ACTIVE_STYLE_ONLY.test(source.text) ||
        CARRIES_STYLE_SET.test(source.text)
      )
    })

    expect(stale).toEqual([])
  })
})
