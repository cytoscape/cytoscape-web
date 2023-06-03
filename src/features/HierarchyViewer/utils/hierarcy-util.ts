export const getHierarchyProperty = (summaryObject: any) => {
  const keys: Iterable<string> = Object.keys(summaryObject)

  return keys.includes('interactionNetworkHost')
}
