import { AppDefinition } from './AppDefinition'
import { ServiceStatus } from './ServiceAppMetadata'

export const useServiceMetadata = async (
  appDefinitions: AppDefinition[],
): Promise<ServiceStatus[]> => {
  try {
    return await serviceMetadataFetcher(appDefinitions)
  } catch (error) {
    console.error('Network Error: failed to fetch app metadata', error)
    throw error
  }
}

const serviceMetadataFetcher = async (
  appDefinitions: AppDefinition[],
): Promise<ServiceStatus[]> => {
  // Get an array of URLs from the appDefinitions
  const urls: string[] = appDefinitions.map((appDef) => appDef.url)

  // Fetch all URLs in parallel using Promise.all
  const serviceStatuses: Array<Promise<ServiceStatus>> = urls.map(async (url) => {
    try {
      const response = await fetch(url)
      const withStatus: ServiceStatus = {
        url,
        services: await response.json(),
        error: response.ok
          ? undefined
          : `Error fetching service at ${url}: ${response.statusText}`,
      }
      return withStatus
    } catch (error) {
      const errorMessage = `'Network error: fetching service at ${url}`
      console.warn(errorMessage, error)
      return { url, error }
    }
  })

  return await Promise.all(serviceStatuses)
}
