export interface NDExProperty {
  subNetworkId: string | null // TODO: Should we allow null?
  predicateString: string
  dataType: string
  value: string
}
