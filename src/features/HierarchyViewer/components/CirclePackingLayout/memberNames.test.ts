// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchNodeNamesByIds } from '../../../../data/external-api/ndex'
import { createNetworkSummary } from '../../../../models/NetworkSummaryModel/impl/networkSummaryImpl'
import { HcxMetaTag } from '../../model/HcxMetaTag'
import {
  interactionNetworkSource,
  isNumericMemberId,
  resolveMemberNames,
} from './memberNames'

vi.mock('../../../../data/external-api/ndex', () => ({
  fetchNodeNamesByIds: vi.fn(),
}))

const DEFAULT_HOST = 'https://default.ndex.org'

const summaryWith = (props: Record<string, string>) =>
  createNetworkSummary({
    networkId: 'hierarchy',
    name: 'Hierarchy',
    properties: Object.entries(props).map(([predicateString, value]) => ({
      predicateString,
      value,
      dataType: undefined as any,
      subNetworkId: null,
    })),
  })

describe('isNumericMemberId', () => {
  it.each([0, 189, '0', '660'])('accepts %j', (member) => {
    expect(isNumericMemberId(member)).toBe(true)
  })

  it.each([
    -1,
    1.5,
    Number.NaN,
    '',
    ' 1',
    '1e3',
    '0x1',
    'SMARCD2',
    null,
    {},
    // Above Number.MAX_SAFE_INTEGER: would be rounded to a different node id
    9007199254740992,
    '9007199254740993',
  ])('rejects %j', (member) => {
    expect(isNumericMemberId(member)).toBe(false)
  })
})

describe('interactionNetworkSource', () => {
  it('is undefined until the summary has loaded', () => {
    expect(interactionNetworkSource(undefined, DEFAULT_HOST)).toBeUndefined()
  })

  it('reads the interaction network of this hierarchy', () => {
    const summary = summaryWith({
      [HcxMetaTag.interactionNetworkUUID]: 'interaction-uuid',
      [HcxMetaTag.interactionNetworkHost]: 'https://other.ndex.org',
    })

    expect(interactionNetworkSource(summary, DEFAULT_HOST)).toEqual({
      id: 'interaction-uuid',
      hostUrl: 'https://other.ndex.org',
    })
  })

  it('falls back to the default host', () => {
    const summary = summaryWith({
      [HcxMetaTag.interactionNetworkUUID]: 'interaction-uuid',
    })

    expect(interactionNetworkSource(summary, DEFAULT_HOST)).toEqual({
      id: 'interaction-uuid',
      hostUrl: DEFAULT_HOST,
    })
  })

  it('has no id for a summary without HCX metadata', () => {
    expect(interactionNetworkSource(summaryWith({}), DEFAULT_HOST)).toEqual({
      id: undefined,
      hostUrl: DEFAULT_HOST,
    })
  })
})

describe('resolveMemberNames', () => {
  const getToken = vi.fn(async () => 'token')
  const fetchNames = vi.mocked(fetchNodeNamesByIds)

  beforeEach(() => {
    vi.clearAllMocks()
    fetchNames.mockResolvedValue(new Map([['0', 'ACTB']]))
  })

  const resolve = (members: unknown[], interactionNetworkId?: string) =>
    resolveMemberNames({
      members,
      interactionNetworkId,
      interactionNetworkHostUrl: DEFAULT_HOST,
      getToken,
    })

  // #933: `Number.parseInt('0')` is falsy, so a member list starting with id 0
  // skipped the lookup
  it('looks names up when the first member id is 0', async () => {
    const names = await resolve([0, 189], 'interaction-uuid')

    expect(fetchNames).toHaveBeenCalledWith(
      'interaction-uuid',
      [0, 189],
      'token',
      DEFAULT_HOST,
    )
    expect(names.get('0')).toBe('ACTB')
  })

  it('accepts numeric ids stored as strings', async () => {
    await resolve(['0', '189'], 'interaction-uuid')

    expect(fetchNames).toHaveBeenCalledWith(
      'interaction-uuid',
      [0, 189],
      'token',
      DEFAULT_HOST,
    )
  })

  it('does not look up members that are already names', async () => {
    const names = await resolve(['SMARCD2', 'SCML1'], 'interaction-uuid')

    expect(fetchNames).not.toHaveBeenCalled()
    expect(names.size).toBe(0)
  })

  it.each([undefined, ''])(
    'does not look anything up without an interaction network (%j)',
    async (interactionNetworkId) => {
      const names = await resolve([0, 1], interactionNetworkId)

      expect(fetchNames).not.toHaveBeenCalled()
      expect(names.size).toBe(0)
    },
  )

  it('returns no names when the lookup fails', async () => {
    fetchNames.mockRejectedValue(new Error('network down'))

    const names = await resolve([0, 1], 'interaction-uuid')

    expect(names.size).toBe(0)
  })
})
