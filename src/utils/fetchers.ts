import { Cx2 } from '../models/CxModel/Cx2'
// TODO: Make client TS compatible
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'

const DEF_URL = 'dev.ndexbio.org'
let ndexClient: NDEx = new NDEx(DEF_URL)

export const ndexNetworkFetcher = async (
  ndexUuid: string,
  url: string,
  accessToken?: string,
): Promise<Cx2> => {
  const ndexClient: NDEx = getNdexClient(url, accessToken)
  const cx2Network: Promise<Cx2> = ndexClient.getCX2Network(ndexUuid)
  return await cx2Network
}

export const getNdexClient = (url: string, accessToken?: string): NDEx => {
  if (url === undefined || url === '') {
    ndexClient = new NDEx(DEF_URL)
  } else if (url !== ndexClient.host) {
    ndexClient = new NDEx(url)
  }

  if (accessToken !== undefined && accessToken !== '') {
    ndexClient.setAuthToken(accessToken)
  }
  return ndexClient
}
