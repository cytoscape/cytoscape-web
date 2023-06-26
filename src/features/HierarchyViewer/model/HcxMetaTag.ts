export type HcxPrefix = 'HCX::'
const hcxPrefix: HcxPrefix = 'HCX::'

export const SubsystemTag = {
  isRoot: `${hcxPrefix}isRoot`,
  members: `${hcxPrefix}members`,
} as const

export type SubsystemTagType = (typeof SubsystemTag)[keyof typeof SubsystemTag]

export const NdexMetaTag = {
  // For curren hierarchy, the value is hierarchy_v0.1
  NdexSchema: 'NdexSchema',
} as const

export type NdexMetaTagType = (typeof NdexMetaTag)[keyof typeof NdexMetaTag]

export const HcxMetaTag = {
  // The service hosting hierarchy and interaction,e.g.	"dev.ndexbio.org"
  interactionNetworkHost: `${hcxPrefix}interactionNetworkHost`,

  // Associated interaction network UUID: e.g.7709cc87-017b-11ee-b7d0-0242c246b7fb
  interactionNetworkUUID: `${hcxPrefix}interactionNetworkUUID`,

  // Number of files to represent the hierarchy: e.g. 2 (hierarchy and interaction)
  modelFileCount: `${hcxPrefix}modelFileCount`,
} as const

export type HcxMetaTagType = (typeof HcxMetaTag)[keyof typeof HcxMetaTag]
