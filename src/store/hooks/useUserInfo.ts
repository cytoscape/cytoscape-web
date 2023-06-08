import { IdType } from '../../models/IdType'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'

const userInfoFetcher = async (
  userId: IdType,
  url: string,
  accessToken?: string,
): Promise<any> => {
  const ndexClient = new NDEx(url)

  if (accessToken !== undefined && accessToken !== '') {
    ndexClient.setAuthToken(accessToken)
  }

  try {
    const userInfo: Promise<any> = await ndexClient.getUser(userId)

    return await userInfo
  } catch (error) {
    console.error('Failed to fetch userInfo', error)
    throw error
  }
}

export const useUserInfo = async (
  userId: IdType,
  url: string,
  accessToken?: string,
): Promise<any> => {
  try {
    return await userInfoFetcher(userId, url, accessToken)
  } catch (error) {
    console.error('Failed to get user info', error)
    throw error
  }
}
