import { describe, expect, it } from 'vitest'

import { classifyInstallPayload } from './classifyInstallPayload'

// Both payloads are the real examples from cytoscape-web#639, trimmed only where
// a field plays no part in classification. The nulls in the service metadata are
// load-bearing: ServiceMetadata declares author/citation as required strings,
// but this is what an endpoint actually sends.

const REACT_MANIFEST_ENTRY = {
  id: 'mcodeweb',
  name: 'MCODE Web',
  version: '0.1.0',
  url: 'https://apps-stage.cytoscape.org/web/mcodeweb/0.1.0/remoteEntry.js',
  author: 'Bader Lab, University of Toronto',
  description: '',
  license: '',
  tags: [],
}

const SERVICE_METADATA = {
  name: 'Update tables example',
  version: '0.9.0',
  cyWebActions: ['updateTables'],
  description: "Adds a new column, named 'test_col' by default.",
  author: null,
  citation: null,
  cyWebMenuItem: {
    root: 'Tools',
    path: [{ name: 'Update tables example', gravity: 1 }],
  },
  serviceInputDefinition: {
    type: 'network',
    scope: 'all',
    inputNetwork: { format: 'cx2', model: 'network' },
    inputColumns: null,
  },
  showDescriptionInDialog: false,
  parameters: [
    {
      displayName: 'Specify column name',
      description: 'Column with specified name will be added',
      type: 'text',
      defaultValue: 'test_col',
      valueList: null,
      minValue: null,
      maxValue: null,
    },
  ],
}

describe('classifyInstallPayload', () => {
  it('classifies an array as a React app manifest', () => {
    const result = classifyInstallPayload([REACT_MANIFEST_ENTRY])

    expect(result?.type).toBe('client')
    if (result?.type === 'client') {
      expect(result.entry.id).toBe('mcodeweb')
      expect(result.entry.url).toBe(REACT_MANIFEST_ENTRY.url)
    }
  })

  it('classifies a single-object manifest as a React app', () => {
    // The example in the issue is a bare object, so the App Store may serve
    // either shape.
    const result = classifyInstallPayload(REACT_MANIFEST_ENTRY)

    expect(result?.type).toBe('client')
    if (result?.type === 'client') {
      expect(result.entry.id).toBe('mcodeweb')
    }
  })

  it('classifies service metadata as a service app', () => {
    const result = classifyInstallPayload(SERVICE_METADATA)

    expect(result?.type).toBe('service')
    if (result?.type === 'service') {
      expect(result.metadata.name).toBe('Update tables example')
      expect(result.metadata.parameters).toHaveLength(1)
    }
  })

  it('keeps unknown fields on service metadata', () => {
    // The service-app spec ships with the paper and gains fields independently
    // of this repo, so stripping them would silently drop capabilities.
    const result = classifyInstallPayload({
      ...SERVICE_METADATA,
      futureField: 'kept',
    })

    expect(result?.type).toBe('service')
    if (result?.type === 'service') {
      expect(
        (result.metadata as unknown as Record<string, unknown>).futureField,
      ).toBe('kept')
    }
  })

  it('honors an explicit type of service over structure', () => {
    // Has a valid `url`, so structure alone would call it a React app.
    const result = classifyInstallPayload({
      ...SERVICE_METADATA,
      type: 'service',
      url: 'https://apps.cytoscape.org/web/x/remoteEntry.js',
    })

    expect(result?.type).toBe('service')
  })

  it('honors an explicit type of client over structure', () => {
    // Has cyWebActions, so structure alone would call it a service app.
    const result = classifyInstallPayload({
      ...REACT_MANIFEST_ENTRY,
      type: 'client',
      cyWebActions: ['updateTables'],
    })

    expect(result?.type).toBe('client')
  })

  it('ignores type inside an array, which stays a React manifest', () => {
    // Documented limitation: a service classification must carry metadata, and a
    // manifest entry carries only a url. Honoring type: 'service' here would
    // need a second fetch, which this function cannot do.
    const result = classifyInstallPayload([
      { ...REACT_MANIFEST_ENTRY, type: 'service' },
    ])

    expect(result?.type).toBe('client')
  })

  it('rejects a manifest entry with no valid url', () => {
    const { url: _url, ...withoutUrl } = REACT_MANIFEST_ENTRY

    expect(classifyInstallPayload([withoutUrl])).toBeUndefined()
    expect(classifyInstallPayload(withoutUrl)).toBeUndefined()
  })

  it('rejects a payload that is neither shape', () => {
    expect(classifyInstallPayload({ hello: 'world' })).toBeUndefined()
    expect(classifyInstallPayload([])).toBeUndefined()
    expect(classifyInstallPayload(null)).toBeUndefined()
    expect(classifyInstallPayload('a string')).toBeUndefined()
  })

  it('rejects service metadata with no name', () => {
    const { name: _name, ...unnamed } = SERVICE_METADATA

    expect(classifyInstallPayload(unnamed)).toBeUndefined()
  })
})
