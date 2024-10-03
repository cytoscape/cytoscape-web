/**
 * There are two types of apps:
 *
 * Service: The app processed the data using a remote service
 * Client: The app processes / displays the results locally
 *
 * If the app is "Client", the app should be able to process the data by itself.
 * If the app is "Service", the app should be able to send the data to the remote service.
 *
 * The Service type apps do not need to write their own UI components. Simply reacts to the
 * return values from the remote service and update the current workspace accordingly.
 *
 */
export const AppType = {
  Service: 'service' as 'service',
  Client: 'client' as 'client',
} as const
