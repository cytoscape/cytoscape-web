import { describe, expect, it } from 'vitest'

import { Visibility } from '../../models/NetworkSummaryModel'
import { createNetworkSummary } from '../../models/NetworkSummaryModel/impl/networkSummaryImpl'
import {
  buildClonedNetworkSummary,
  CLONE_NAME_PREFIX,
} from './cloneNetworkUtil'

describe('buildClonedNetworkSummary (CW-755)', () => {
  const source = createNetworkSummary({
    networkId: 'ndex-uuid-1',
    name: 'MuSIC',
    description: 'a hierarchy',
    version: '2.0',
    visibility: Visibility.PUBLIC,
    isNdex: true,
    externalId: 'ndex-uuid-1',
    ownerUUID: 'owner-1',
    hasLayout: true,
    nodeCount: 10,
    edgeCount: 20,
    properties: [
      {
        predicateString: 'foo',
        value: 'bar',
        dataType: undefined as any,
        subNetworkId: null,
      },
    ],
  })

  it('names the clone "Copy of <original>"', () => {
    const clone = buildClonedNetworkSummary(source, 'new-local-id')
    expect(clone.name).toBe(`${CLONE_NAME_PREFIX}MuSIC`)
  })

  it('makes the clone local-only regardless of the source being on NDEx', () => {
    const clone = buildClonedNetworkSummary(source, 'new-local-id')
    expect(clone.isNdex).toBe(false)
    expect(clone.visibility).toBe(Visibility.LOCAL)
  })

  it('resets NDEx identity to the new local id', () => {
    const clone = buildClonedNetworkSummary(source, 'new-local-id')
    expect(clone.externalId).toBe('new-local-id')
    expect(clone.ownerUUID).toBe('new-local-id')
  })

  it('carries over layout state, counts, and properties from the source', () => {
    const clone = buildClonedNetworkSummary(source, 'new-local-id')
    expect(clone.hasLayout).toBe(true)
    expect(clone.nodeCount).toBe(10)
    expect(clone.edgeCount).toBe(20)
    expect(clone.properties).toEqual(source.properties)
  })
})
