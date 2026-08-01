// Module Federation runtime plugin that resolves the `cyweb` host entry at
// RUNTIME instead of build time.
//
// Mirrors what the app-examples repo ships in every migrated app (its
// vite-migration spec §6.4). Kept byte-for-byte equivalent in behaviour on
// purpose: this fixture is how the host repo proves the mechanism works against
// the real loader before any example depends on it.
//
// The host publishes its own remoteEntry.js URL on `window.__CYWEB_HOST__`
// during boot (src/app-api/federation/hostDescriptor.ts); this replaces the
// compiled-in placeholder with it. Effect: one build of an app works against
// any Cytoscape Web deployment — production, a Netlify branch preview, or a
// local host on any port.

import { CYWEB_HOST_REQUIRED } from './cywebHostSentinel'

// Structural subset of the MF runtime plugin contract. Declared locally rather
// than imported from @module-federation/runtime: that package's types reach
// @module-federation/sdk, whose ModuleFederationPlugin.d.ts does
// `import webpack from "webpack"` — a package neither repo depends on.
type RemoteEntryRecord = { name?: string; entry?: string }
type BeforeInitArgs = {
  userOptions: { remotes?: RemoteEntryRecord[] }
  options: { remotes?: RemoteEntryRecord[] }
}
type MfRuntimePlugin = {
  name: string
  // GENERIC pass-through, not `(args: BeforeInitArgs) => BeforeInitArgs`. The
  // real hook is a SyncWaterfallHook over `{userOptions, options, origin,
  // shareInfo}`; a signature that returns the narrowed type drops `origin` and
  // `shareInfo` and is not assignable (TS2322) when the plugin is handed to a
  // real ModuleFederation instance.
  beforeInit: <T extends BeforeInitArgs>(args: T) => T
}

const HOST_REMOTE_NAME = 'cyweb'

/**
 * The host's entry URL, or undefined if the descriptor cannot be used for
 * routing. Validates the two fields routing depends on — `name` identifies the
 * descriptor as Cytoscape Web's, and an empty or relative `remoteEntry` is as
 * wrong as a missing one. `apiVersion` is deliberately NOT checked here; acting
 * on it is deferred work (§6.6).
 */
const readHostEntry = (): string | undefined => {
  const descriptor = (
    globalThis as { __CYWEB_HOST__?: { name?: unknown; remoteEntry?: unknown } }
  ).__CYWEB_HOST__
  if (descriptor?.name !== HOST_REMOTE_NAME) return undefined

  const value = descriptor.remoteEntry
  if (typeof value !== 'string' || value === '') return undefined
  try {
    // Absolute only: `new URL(relative)` throws, so this rejects relative paths
    // as well as non-HTTP schemes.
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:' ? value : undefined
  } catch {
    return undefined
  }
}

/**
 * When the descriptor is missing or malformed, behavior depends on what the
 * build compiled in: a dev build keeps its localhost entry, a production build
 * carries the sentinel and fails loudly here. It must never silently fall back
 * to a localhost URL in production — that would send a deployed app at the end
 * user's own loopback address.
 */
export default function cywebHostResolver(): MfRuntimePlugin {
  return {
    name: 'cyweb-host-resolver',
    beforeInit(args) {
      const hostEntry = readHostEntry()

      // userOptions.remotes is what formatAndRegisterRemote actually reads on
      // first init; options.remotes is the already-registered set consulted on
      // re-init (registerRemote uses force:false, so it wins there). Writing
      // only one of the two works in exactly one of the two cases.
      for (const list of [args.userOptions.remotes, args.options.remotes]) {
        for (const remote of list ?? []) {
          if (remote.name !== HOST_REMOTE_NAME || !('entry' in remote)) continue

          if (hostEntry !== undefined) {
            remote.entry = hostEntry
          } else if (remote.entry === CYWEB_HOST_REQUIRED) {
            throw new Error(
              `[cyweb-host-resolver] This app must be loaded by Cytoscape Web: ` +
                `window.__CYWEB_HOST__ is missing or invalid. The host ` +
                `publishes it at boot; a host that predates it cannot load ` +
                `this app.`,
            )
          }
          // else: dev build, compiled-in localhost entry stands.
        }
      }
      return args
    },
  }
}
