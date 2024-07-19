export interface HcxMetaData {
  // Currently, this is always "*.ndexbio.org"
  // If not available, use the same NDEx server specified in the config file.
  interactionNetworkHost?: string

  // UUID v4 (Interaction network ID)
  interactionNetworkUUID: string

  // Integer only (number of files)
  modelFileCount: number
}
