import { RootMenu } from './RootMenu'
import { ServiceAppAction } from './ServiceAppAction'
import { ServiceInputDefinition } from './ServiceInputDefinition'

/**
 * Service Metadata fetched from the endpoint.
 *
 * This will be stored as a part of ServiceApp data model
 *
 */
export interface ServiceMetadata {
  name: string
  description?: string
  version: string
  serviceInputDefinition?: ServiceInputDefinition
  cyWebAction: ServiceAppAction
  cyWebMenuItem: RootMenu

  parameters: []
}
