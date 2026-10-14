import { expect, test } from './fixtures'

// THE descriptor contract, defined once.
//
// `window.__CYWEB_HOST__` is how a federated app finds this host's
// remoteEntry.js at runtime (src/app-api/federation/hostDescriptor.ts). A
// migrated app compiles in an unloadable sentinel rather than a localhost
// fallback, so a host that fails any assertion below cannot load apps at all —
// which is why this is a deployment gate, not just a unit test.
//
// The assertions mirror exactly what a remote's resolver enforces
// (test/fixtures/remote-app/mfRuntimePlugin.ts `readHostEntry`), plus the
// immutability hostDescriptor.ts promises and a real load of the entry it
// names. Do not restate a subset of this list anywhere else — reference it.
//
// Runs against the local build by default. To check a deployed host (the
// app-examples Vite migration makes this a Phase 2 exit criterion):
//
//   CYWEB_HOST_URL=https://web.cytoscape.org npx playwright test host-descriptor --project=chromium

// index.tsx dynamically imports ./boot/bootstrap, so the descriptor does not
// exist at `load` or `domcontentloaded` — it has to be waited for.
const HOST_DESCRIPTOR_TIMEOUT_MS = 30_000

type Probe = {
  name: unknown
  remoteEntry: unknown
  apiVersion: unknown
  frozen: boolean
  writable: boolean | undefined
  configurable: boolean | undefined
}

test.describe('host descriptor contract', () => {
  test('publishes a well-formed, immutable, loadable descriptor', async ({
    page,
  }) => {
    await page.goto('/')

    // waitForFunction(pageFunction, arg, options) — options is the THIRD
    // parameter. Passing { timeout } second makes it the page-function `arg`
    // and silently leaves the timeout at its default.
    await page.waitForFunction(
      () => window.__CYWEB_HOST__ !== undefined,
      undefined,
      { timeout: HOST_DESCRIPTOR_TIMEOUT_MS },
    )

    const probe: Probe = await page.evaluate(() => {
      const value = window.__CYWEB_HOST__
      const descriptor = Object.getOwnPropertyDescriptor(
        window,
        '__CYWEB_HOST__',
      )
      return {
        name: value?.name,
        remoteEntry: value?.remoteEntry,
        apiVersion: value?.apiVersion,
        frozen: Object.isFrozen(value),
        writable: descriptor?.writable,
        configurable: descriptor?.configurable,
      }
    })

    // Identity — a remote checks this before routing anything through it.
    expect(probe.name).toBe('cyweb')

    // Absolute http(s). A relative value would resolve against the REMOTE's
    // origin, and a non-HTTP scheme is not fetchable at all.
    expect(typeof probe.remoteEntry).toBe('string')
    const entryUrl = new URL(probe.remoteEntry as string)
    expect(['http:', 'https:']).toContain(entryUrl.protocol)

    // Published so a future version-skew check has something to read.
    expect(typeof probe.apiVersion).toBe('string')
    expect(probe.apiVersion).not.toBe('')

    // Immutability is part of the contract, not an implementation detail: once
    // a remote has loaded, the MF runtime caches its Module against the
    // remoteInfo it was created with, so a mutable descriptor would promise an
    // update path that cannot work. Assert it rather than assume it.
    expect(probe.frozen).toBe(true)
    expect(probe.writable).toBe(false)
    expect(probe.configurable).toBe(false)

    // The URL must name a real ES module container. A 200 proves nothing on an
    // SPA — any unknown path returns index.html — so import it and look for the
    // federation entry points.
    const response = await page.request.get(entryUrl.href)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type'] ?? '').toMatch(
      /javascript|ecmascript/i,
    )

    const containerShape = await page.evaluate(async (url) => {
      const namespace = (await import(/* @vite-ignore */ url)) as Record<
        string,
        unknown
      >
      return {
        init: typeof namespace.init,
        get: typeof namespace.get,
      }
    }, entryUrl.href)

    expect(containerShape).toEqual({ init: 'function', get: 'function' })
  })
})
