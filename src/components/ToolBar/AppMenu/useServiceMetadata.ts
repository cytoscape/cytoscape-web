import { AppDefinition } from './AppDefinition'
import { Services } from './ServiceAppMetadata'

export const useServiceMetadata = async (
  appDefinitions: AppDefinition[],
): Promise<Services> => {
  try {
    return await serviceMetadataFetcher(appDefinitions)
  } catch (error) {
    console.error('Failed to fetch app', error)
    throw error
  }
}

const serviceMetadataFetcher = async (
  appDefinitions: AppDefinition[],
): Promise<Services> => {
  // Get an array of URLs from the appDefinitions
  const urls: string[] = appDefinitions.map((appDef) => appDef.url)

  // Fetch all URLs in parallel using Promise.all
  const responses: Response[] = await Promise.all(urls.map((url) => fetch(url)))

  const services: Service[] = await Promise.all(responses.map(response => response.json()));

  return services
}
