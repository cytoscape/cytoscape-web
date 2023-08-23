import { Pathname } from "react-router-dom"

export interface ParsedUrlParams {
  workspaceId: string
  networkId: string
}
/**
 * Utility function to parse the pathname
 * 
 * @param pathname 
 * @returns 
 */
export const parsePathName = (pathname: Pathname): ParsedUrlParams => {
  const parts = pathname.split('/')
  const parsed: ParsedUrlParams = {
    workspaceId: '',
    networkId: '',
  }

  // Empty path is ['', '']
  if(parts.length < 2) {
    // Invalid path (something went wrong)
    return parsed
  }
  
  if(parts.length === 2 || parts.length === 3) {
    // Only workspace ID is available
    // TODO: Validate workspace ID here
    parsed.workspaceId = parts[1]
    return parsed
  }

  if(parts.length === 4) {
    // Both workspace ID and network ID are available
    parsed.workspaceId = parts[1]
    parsed.networkId = parts[3]
    return parsed
  }

  return parsed 
}
