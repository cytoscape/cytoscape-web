import { ServiceMetadata } from './ServiceMetadata'

/**
 * The interface for the service-type apps
 *
 * URL is the only required parameter, and
 * it will be provided by the user.
 *
 * The rest of the parameters are fetched from the
 * service endpoint.
 *
 */
export interface ServiceApp extends ServiceMetadata {
  // URL of the service to be called
  url: string
}
