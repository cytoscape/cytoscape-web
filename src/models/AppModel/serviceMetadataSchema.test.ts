// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  parseServiceMetadata,
  serviceMetadataIfMarked,
} from './serviceMetadataSchema'

describe('parseServiceMetadata', () => {
  it('accepts null author and citation, as real endpoints send them', () => {
    // ServiceMetadata declares both as required strings. A schema written to
    // match the interface literally would reject every service app in the wild.
    const metadata = parseServiceMetadata({
      name: 'Update tables example',
      version: '0.9.0',
      author: null,
      citation: null,
      cyWebActions: ['updateTables'],
      parameters: [],
    })

    expect(metadata?.name).toBe('Update tables example')
  })

  it('accepts the minimum a registered service app carries today', () => {
    // What AppStore.spec.ts registers. Requiring a service marker to register
    // would reject these — that check belongs to classification, not validity.
    expect(
      parseServiceMetadata({ name: 'Service A', parameters: [] }),
    ).toBeDefined()
  })

  it('defaults parameters to an empty array', () => {
    // updateServiceParameter calls serviceApp.parameters.find(...), which throws
    // when the array is absent.
    expect(parseServiceMetadata({ name: 'Service A' })?.parameters).toEqual([])
  })

  it('preserves unknown fields', () => {
    const metadata = parseServiceMetadata({
      name: 'Service A',
      futureField: 'kept',
    })

    expect((metadata as unknown as Record<string, unknown>).futureField).toBe(
      'kept',
    )
  })

  it('keeps a parameter with a malformed groups value (warn-only, never a rejection)', () => {
    // A service that already sent a `groups` field of the wrong shape must
    // keep loading: the form treats it as "no groups" and the log says why.
    const metadata = parseServiceMetadata({
      name: 'Service A',
      parameters: [
        { displayName: 'Mode', type: 'text', groups: 'Advanced' },
        { displayName: 'Ok', type: 'text', groups: ['Advanced'] },
      ],
    })

    expect(metadata).toBeDefined()
    const parameters = (metadata?.parameters ?? []) as unknown as Array<
      Record<string, unknown>
    >
    expect(parameters).toHaveLength(2)
    expect(parameters[0].groups).toBe('Advanced')
  })

  it('drops a parameter named __proto__ and keeps the rest', () => {
    // No plain record keyed by parameter key can hold that name (the value
    // vanishes into the prototype setter), so the one parameter goes, not
    // the service.
    const metadata = parseServiceMetadata({
      name: 'Service A',
      parameters: [
        { displayName: 'Mode', type: 'text' },
        { displayName: '__proto__', type: 'text' },
        { displayName: 'Ok', type: 'text' },
      ],
    })

    expect(metadata?.parameters.map((p) => p.displayName)).toEqual([
      'Mode',
      'Ok',
    ])
  })

  it('rejects a missing or empty name', () => {
    expect(parseServiceMetadata({ parameters: [] })).toBeUndefined()
    expect(parseServiceMetadata({ name: '' })).toBeUndefined()
    expect(parseServiceMetadata(null)).toBeUndefined()
  })
})

describe('serviceMetadataIfMarked', () => {
  it.each(['cyWebActions', 'cyWebMenuItem', 'serviceInputDefinition'])(
    'parses when %s is present',
    (marker) => {
      const metadata = serviceMetadataIfMarked({
        name: 'Service A',
        parameters: [],
        [marker]: marker === 'cyWebActions' ? [] : {},
      })

      expect(metadata?.name).toBe('Service A')
    },
  )

  it('returns undefined for valid metadata with no service marker', () => {
    expect(
      serviceMetadataIfMarked({ name: 'Service A', parameters: [] }),
    ).toBeUndefined()
  })

  it('returns undefined for a React app manifest entry', () => {
    expect(
      serviceMetadataIfMarked({
        id: 'mcodeweb',
        name: 'MCODE Web',
        url: 'https://apps.cytoscape.org/web/mcodeweb/remoteEntry.js',
      }),
    ).toBeUndefined()
  })

  it('returns undefined when a marked payload fails the schema', () => {
    // Marked but unusable: the marker alone must not get it registered.
    expect(
      serviceMetadataIfMarked({ cyWebActions: ['updateTables'] }),
    ).toBeUndefined()
  })
})
