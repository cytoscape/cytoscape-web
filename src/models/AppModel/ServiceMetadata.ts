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
  // When false, the description is not shown at the top of the input dialog.
  // Defaults to shown (any value other than false) when a description exists.
  showDescriptionInDialog?: boolean
  version: string
  serviceInputDefinition?: ServiceInputDefinition
  cyWebActions: ServiceAppAction[]
  cyWebMenuItem: CyWebMenuItem
  // Nullable because endpoints send null rather than omitting them — the live
  // cytocontainer example service does exactly that for both.
  author: string | null
  citation: string | null
  parameters: ServiceAppParameter[]
}
