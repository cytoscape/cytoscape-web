// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { buildDefaultManifestUrl, ensureTrailingSlash } from './baseUrl'

describe('ensureTrailingSlash', () => {
  it('appends a slash when missing', () => {
    expect(ensureTrailingSlash('/cytoscape')).toBe('/cytoscape/')
  })

  it('leaves an existing trailing slash alone', () => {
    expect(ensureTrailingSlash('/cytoscape/')).toBe('/cytoscape/')
  })

  it('turns the empty base into the root path', () => {
    expect(ensureTrailingSlash('')).toBe('/')
  })

  it('leaves the bare root path alone', () => {
    expect(ensureTrailingSlash('/')).toBe('/')
  })
})

describe('buildDefaultManifestUrl', () => {
  it('serves the catalog from the origin root on a root deployment', () => {
    expect(buildDefaultManifestUrl('/')).toBe('/apps.json')
  })

  it('keeps the base path when the host is deployed under a subpath', () => {
    // dev1 serves the app at /cytoscape/. A bare '/apps.json' resolves to the
    // origin root there, which is another site's page (NDEx answers 200 with
    // HTML), so the default catalog loaded empty and no app was listed.
    expect(buildDefaultManifestUrl('/cytoscape/')).toBe('/cytoscape/apps.json')
  })

  it('normalizes a base with no trailing slash', () => {
    // Vite does not guarantee the slash on import.meta.env.BASE_URL (see
    // hostDescriptor.ts), and '/cytoscapeapps.json' would 404.
    expect(buildDefaultManifestUrl('/cytoscape')).toBe('/cytoscape/apps.json')
  })
})
