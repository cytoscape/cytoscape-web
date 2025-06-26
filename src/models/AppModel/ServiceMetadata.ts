import { CyWebMenuItem } from './CyWebMenuItem'
import { ServiceAppAction } from './ServiceAppAction'
import { ServiceAppParameter } from './ServiceAppParameter'
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
  cyWebAction: ServiceAppAction[]
  cyWebMenuItem: CyWebMenuItem
  author: string
  citation:string
  parameters: ServiceAppParameter[]
  showDescriptionInDialog: boolean
}
