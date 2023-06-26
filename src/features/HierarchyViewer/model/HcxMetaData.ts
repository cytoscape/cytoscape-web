export interface HcxMetaData {
  // Currently, this is always "*.ndexbio.org"
  interactionNetworkHost: string

  // UUID v4 (Interaction network ID)
  interactionNetworkUUID: string

  // Integer only (number of files)
  modelFileCount: number
}
