import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { FEDERATION_EXPOSES } from './federationExposes'

// The hand-maintained ambient declarations plugin authors compile against.
const DECLARATIONS_PATH = path.resolve(
  __dirname,
  '../../../packages/api-types/src/mf-declarations.d.ts',
)

// Parse `declare module 'cyweb/<Name>'` blocks → set of `./<Name>` keys.
function parseDeclaredExposes(source: string): Set<string> {
  const re = /declare module ['"]cyweb\/([^'"]+)['"]/g
  const keys = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = re.exec(source)) !== null) {
    keys.add(`./${match[1]}`)
  }
  return keys
}

// The typed public subset: API hooks + EventBus + AppIdContext + ApiTypes.
// Raw `*Store` exposes and the task hooks (CreateNetwork*) are intentionally
// untyped for plugin authors, so they are NOT expected to have declarations.
function isTypedExpose(key: string): boolean {
  if (key.endsWith('Store')) return false
  if (key === './CreateNetwork' || key === './CreateNetworkFromCx2') {
    return false
  }
  return true
}

describe('api-types ↔ federation exposes parity', () => {
  const source = fs.readFileSync(DECLARATIONS_PATH, 'utf8')
  const declared = parseDeclaredExposes(source)
  const exposeKeys = Object.keys(FEDERATION_EXPOSES)

  it('declares only modules that are actually exposed', () => {
    for (const key of declared) {
      expect(exposeKeys, `declared but not exposed: cyweb/${key}`).toContain(
        key,
      )
    }
  })

  it('declares every typed public expose', () => {
    const typed = exposeKeys.filter(isTypedExpose)
    for (const key of typed) {
      expect(
        declared.has(key),
        `exposed typed module missing a declaration: cyweb/${key}`,
      ).toBe(true)
    }
  })
})
