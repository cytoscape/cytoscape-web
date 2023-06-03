export type HcxPrefix = 'HCX::'
const hcxPrefix: HcxPrefix = 'HCX::'

export const HcxMetaTags = {
  // The service hosting hierarchy and interaction,e.g.	"dev.ndexbio.org"
  interactionNetworkHost: `${hcxPrefix}interactionNetworkHost`,

  // Associated interaction network UUID: e.g.7709cc87-017b-11ee-b7d0-0242c246b7fb
  interactionNetworkUUID: 'HCX::interactionNetworkUUID',

  // Number of files to represent the hierarchy: e.g. 2 (hierarchy and interaction)
  modelFileCount: 'HCX::modelFileCount',
} as const

export type HcxMetaTagType = (typeof HcxMetaTags)[keyof typeof HcxMetaTags]
