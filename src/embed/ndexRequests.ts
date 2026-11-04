import { getNDExBaseUrl } from '@/data/external-api/ndex/config'
import { Cx2 } from '@/models/CxModel/Cx2'
import { IdType } from '@/models/IdType'

/**
 * NDEx requests the embed makes with fetch rather than the NDEx client, so
 * that it can start them early and abort them. They send no token: the
 * embed shows public networks only.
 */

export class NdexRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'NdexRequestError'
  }
}

/** A private network answers 401 or 403; the embed treats both as absent. */
export const isNotFound = (error: unknown): boolean =>
  error instanceof NdexRequestError &&
  (error.status === 404 || error.status === 401 || error.status === 403)

const baseUrl = (host?: string): string => {
  const url = host === undefined || host === '' ? getNDExBaseUrl() : host
  const withScheme = /^https?:\/\//.test(url) ? url : `https://${url}`
  return withScheme.replace(/\/+$/, '')
}

const requestJson = async <T>(url: string, init: RequestInit): Promise<T> => {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new NdexRequestError(
      response.status,
      `NDEx answered ${response.status} for ${url}`,
    )
  }
  return (await response.json()) as T
}

/** GET /v3/networks/<uuid>: the network's CX2. */
export const fetchCx2 = (
  networkId: IdType,
  { host, signal }: { host?: string; signal?: AbortSignal } = {},
): Promise<Cx2> =>
  requestJson<Cx2>(
    `${baseUrl(host)}/v3/networks/${encodeURIComponent(networkId)}`,
    { signal },
  )

/**
 * POST /v3/search/networks/<uuid>/interconnectquery: the nodes with these
 * ids and the edges between them, as CX2. The request the NDEx client's
 * interConnectQuery makes for fetchNdexInterconnectQuery.
 */
export const fetchInterconnect = (
  networkId: IdType,
  nodeIds: number[],
  { host, signal }: { host?: string; signal?: AbortSignal } = {},
): Promise<Cx2> =>
  requestJson<Cx2>(
    `${baseUrl(host)}/v3/search/networks/${encodeURIComponent(networkId)}/interconnectquery`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchString: '', nodeIds }),
      signal,
    },
  )
