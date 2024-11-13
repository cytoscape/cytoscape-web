import { ServiceApp } from '../models/AppModel/ServiceApp'
import { ServiceMetadata } from '../models/AppModel/ServiceMetadata'

const sampleUrl = 'https://cd.ndexbio.org/cy/cytocontainer/v1/louvain'

export const serviceFetcher = async (url: string): Promise<ServiceApp> => {
  // Fetch the service app metadata from the given URL

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    throw new Error("Failed to fetch the service metadata.")
  }

  const metadata: ServiceMetadata = await response.json()
  const serviceApp: ServiceApp = {
    url,
    ...metadata,
  }

  return serviceApp
}
