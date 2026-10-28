// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'

import { CYWEB_HOST_REQUIRED } from './cywebHostSentinel'
import cywebHostResolver from './mfRuntimePlugin'

const HOST_ENTRY = 'https://web.cytoscape.org/remoteEntry.js'

type Remote = { name?: string; alias?: string; entry?: string }

const runBeforeInit = (remotes: Remote[]): Remote[] => {
  const args = {
    userOptions: { remotes },
    options: { remotes: [] as Remote[] },
  }
  cywebHostResolver().beforeInit(args)
  return args.userOptions.remotes
}

const setDescriptor = (value: unknown): void => {
  ;(globalThis as { __CYWEB_HOST__?: unknown }).__CYWEB_HOST__ = value
}

afterEach(() => {
  delete (globalThis as { __CYWEB_HOST__?: unknown }).__CYWEB_HOST__
})

describe('cywebHostResolver', () => {
  it('rewrites a remote named cyweb (@module-federation/vite <= 1.16)', () => {
    setDescriptor({ name: 'cyweb', remoteEntry: HOST_ENTRY })
    const [remote] = runBeforeInit([
      { name: 'cyweb', entry: CYWEB_HOST_REQUIRED },
    ])
    expect(remote.entry).toBe(HOST_ENTRY)
  })

  // @module-federation/vite 1.23 namespaces the remote's name and keeps the
  // user-facing key in `alias` (#913).
  it('rewrites a remote aliased cyweb under an internal name (1.23+)', () => {
    setDescriptor({ name: 'cyweb', remoteEntry: HOST_ENTRY })
    const [remote] = runBeforeInit([
      {
        alias: 'cyweb',
        name: '__mfe_internal__testRemoteApp__mf_owner__40954818151614__cyweb',
        entry: CYWEB_HOST_REQUIRED,
      },
    ])
    expect(remote.entry).toBe(HOST_ENTRY)
  })

  it('also rewrites the already-registered set used on re-init', () => {
    setDescriptor({ name: 'cyweb', remoteEntry: HOST_ENTRY })
    const registered: Remote = { alias: 'cyweb', name: 'x__cyweb', entry: '' }
    const args = {
      userOptions: { remotes: [] as Remote[] },
      options: { remotes: [registered] },
    }
    cywebHostResolver().beforeInit(args)
    expect(registered.entry).toBe(HOST_ENTRY)
  })

  it('leaves other remotes alone, even one whose name ends in cyweb', () => {
    setDescriptor({ name: 'cyweb', remoteEntry: HOST_ENTRY })
    const remotes = runBeforeInit([
      { name: 'other', entry: 'https://other.example/remoteEntry.js' },
      {
        alias: 'notcyweb',
        name: '__mfe_internal__app__mf_owner__1__cyweb',
        entry: 'https://x.example/remoteEntry.js',
      },
    ])
    expect(remotes.map((r) => r.entry)).toEqual([
      'https://other.example/remoteEntry.js',
      'https://x.example/remoteEntry.js',
    ])
  })

  it.each([
    ['missing', undefined],
    ['another app', { name: 'evil', remoteEntry: HOST_ENTRY }],
    ['a relative entry', { name: 'cyweb', remoteEntry: '/remoteEntry.js' }],
    [
      'a javascript: entry',
      { name: 'cyweb', remoteEntry: 'javascript:alert(1)' },
    ],
  ])(
    'fails loudly on the sentinel when the descriptor is %s',
    (_label, descriptor) => {
      setDescriptor(descriptor)
      expect(() =>
        runBeforeInit([
          { alias: 'cyweb', name: 'x__cyweb', entry: CYWEB_HOST_REQUIRED },
        ]),
      ).toThrow('must be loaded by Cytoscape Web')
    },
  )

  it('keeps a dev build localhost entry when no descriptor is present', () => {
    const [remote] = runBeforeInit([
      {
        alias: 'cyweb',
        name: 'x__cyweb',
        entry: 'http://localhost:5500/remoteEntry.js',
      },
    ])
    expect(remote.entry).toBe('http://localhost:5500/remoteEntry.js')
  })
})
