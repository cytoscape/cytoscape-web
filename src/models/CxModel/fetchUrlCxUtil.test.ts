import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchUrlCx } from './fetchUrlCxUtil'

const VALID_CX = [
  { CXVersion: '2.0' },
  {
    metaData: [
      { name: 'nodes', elementCount: 2 },
      { name: 'edges', elementCount: 1 },
    ],
  },
  { nodes: [{ id: 1 }, { id: 2 }] },
  { edges: [{ id: 1, s: 1, t: 2 }] },
  { status: [{ success: true }] },
]

const mockFetch = (options: {
  contentLength?: string
  body?: string
  ok?: boolean
  status?: number
}): ReturnType<typeof vi.fn> => {
  const { contentLength, body = JSON.stringify(VALID_CX), ok = true, status = 200 } = options
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'HEAD') {
      return {
        ok,
        status,
        headers: {
          get: (name: string) =>
            name === 'Content-Length' ? (contentLength ?? null) : null,
        },
      } as unknown as Response
    }
    return {
      ok,
      status,
      headers: { get: () => null },
      text: async () => body,
      json: async () => JSON.parse(body),
    } as unknown as Response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('fetchUrlCx', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches and converts a CX2 network within the size limit', async () => {
    mockFetch({ contentLength: '500' })

    const { summary, cyNetwork } = await fetchUrlCx(
      'https://example.org/net.cx2',
      10_000,
    )

    expect(cyNetwork.network.nodes).toHaveLength(2)
    expect(summary.nodeCount).toBe(2)
    expect(summary.edgeCount).toBe(1)
  })

  it('rejects early when Content-Length exceeds the limit', async () => {
    const fetchMock = mockFetch({ contentLength: '999999' })

    await expect(
      fetchUrlCx('https://example.org/net.cx2', 1000),
    ).rejects.toThrow(/too large/)
    // Fast fail: the full GET was never issued
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  // REVIEW.md B15: the limit used to rely SOLELY on the HEAD
  // Content-Length header — absent header (chunked transfer, CORS) meant
  // no limit at all.
  it('enforces the limit on the actual body when Content-Length is absent (regression: B15)', async () => {
    const hugeBody = JSON.stringify(VALID_CX).padEnd(5000, ' ')
    mockFetch({ contentLength: undefined, body: hugeBody })

    await expect(
      fetchUrlCx('https://example.org/net.cx2', 1000),
    ).rejects.toThrow(/too large/)
  })

  it('throws on a non-OK response', async () => {
    mockFetch({ ok: false, status: 404 })

    await expect(
      fetchUrlCx('https://example.org/net.cx2', 10_000),
    ).rejects.toThrow()
  })

  it('throws on invalid JSON', async () => {
    mockFetch({ body: '{ not json' })

    await expect(
      fetchUrlCx('https://example.org/net.cx2', 10_000),
    ).rejects.toThrow()
  })
})
