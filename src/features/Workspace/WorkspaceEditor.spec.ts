// @vitest-environment node
// src/features/Workspace/WorkspaceEditor.spec.ts
//
// Guards the store-subscription leak removed in #680.
//
// WorkspaceEditor used to call `useViewModelStore.subscribe(...)` and
// `useVisualStyleStore.subscribe(...)` in its component body to maintain the
// `networkModified` flag. Zustand's `subscribe` returns an unsubscribe
// function; the component discarded it and re-subscribed on every render, so
// the listener count grew for the life of the session and each listener read a
// stale `workspace` from its render closure.
//
// This is a source assertion rather than a render test on purpose: rendering
// the real WorkspaceEditor needs a router, the app config context, a hydrated
// IndexedDB and several lazy children, and the invariant being pinned — "no
// store subscription is registered here" — is fully visible in the source. A
// `subscribe` call anywhere in this component is the defect, in an effect or
// not, so the check does not need to distinguish where it sits.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const SOURCE = readFileSync(
  join(import.meta.dirname, 'WorkspaceEditor.tsx'),
  'utf8',
)

/** Source with line and block comments stripped, so prose cannot match. */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\s\/\/.*$/gm, '')
}

describe('WorkspaceEditor store subscriptions (#680)', () => {
  it('registers no zustand store subscription', () => {
    const code = withoutComments(SOURCE)

    const subscriptions = code.match(/use\w*Store\s*\.\s*subscribe\s*\(/g) ?? []

    expect(subscriptions).toEqual([])
  })

  it('does not write the networkModified flag outside layout completion', () => {
    const code = withoutComments(SOURCE)

    // The one remaining use is the `setNetworkModified` action handed to
    // createLayoutCompletionHandler, which clears the flag after the
    // automatic initial layout. Any direct `setNetworkModified(id, true)`
    // here is the drift #680 removed — mark through postEdit instead.
    expect(code).not.toMatch(/setNetworkModified\([^)]*,\s*true\s*\)/)
  })
})
