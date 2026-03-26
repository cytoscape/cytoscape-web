/**
 * NDEx Files API
 *
 * Provides folder and file search operations for the NDEx v3 file system.
 * Used by LoadFromNdexDialog for folder browsing and search.
 *
 * @module api/ndex/files
 */

import { getNdexClient } from './client'

/**
 * Result item from file search or folder listing.
 * Represents a network, folder, or shortcut in the NDEx file system.
 */
export interface NdexFileItem {
  uuid: string
  name: string
  type: 'NETWORK' | 'FOLDER' | 'SHORTCUT'
  modificationTime: string | Date | number
  owner?: string
  ownerUUID?: string
  visibility?: string
  edges?: number
  permission?: string
  attributes?: Record<string, any>
}

/**
 * Result from a file search operation.
 */
export interface NdexFileSearchResult {
  files: NdexFileItem[]
  numFound: number
}

/**
 * Searches for files (networks, folders, shortcuts) in NDEx using the v3 search API.
 *
 * @param searchString - Search query string
 * @param visibility - Visibility filter: 'PUBLIC' or 'PRIVATE'
 * @param accessToken - Optional authentication token
 * @param accountName - Optional account name to filter by owner
 * @param start - Pagination start offset (defaults to 0)
 * @param size - Page size (defaults to 500)
 * @param ndexUrl - Optional NDEx base URL
 * @returns Promise resolving to search results with files and total count
 */
export const searchNdexFiles = async (
  searchString: string,
  visibility: 'PUBLIC' | 'PRIVATE',
  accessToken?: string,
  accountName?: string,
  start?: number,
  size?: number,
  ndexUrl?: string,
): Promise<NdexFileSearchResult> => {
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  const params: any = {
    searchString: searchString.trim() ? searchString : '*',
    visibility,
    start: start ?? 0,
    size: size ?? 500,
  }
  if (accountName) {
    params.accountName = accountName
  }

  const result = await ndexClient.files.searchFiles(params)
  return {
    files: ((result as any)?.files ?? result?.ResultList ?? [])
      .filter((item: any) => item != null && typeof item === 'object')
      .map(mapFileListItem),
    numFound: result?.numFound ?? 0,
  }
}

/**
 * Fetches contents of a folder (networks, sub-folders, shortcuts).
 *
 * @param folderId - Folder UUID, or 'home' for the user's home folder
 * @param accessToken - Authentication token
 * @param ndexUrl - Optional NDEx base URL
 * @returns Promise resolving to array of file items in the folder
 */
export const fetchFolderContents = async (
  folderId: string | null,
  accessToken: string,
  ndexUrl?: string,
): Promise<NdexFileItem[]> => {
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  const id = folderId ?? 'home'
  const items = await ndexClient.files.getFolderList(id, undefined, 'compact')
  return (items ?? [])
    .filter((item: any) => item != null && typeof item === 'object')
    .map(mapFileListItem)
}

/**
 * Fetches metadata for a specific folder.
 *
 * @param folderId - Folder UUID
 * @param accessToken - Authentication token
 * @param ndexUrl - Optional NDEx base URL
 * @returns Promise resolving to folder metadata
 */
export const fetchFolderInfo = async (
  folderId: string,
  accessToken: string,
  ndexUrl?: string,
): Promise<{
  uuid: string
  name: string
  parent: string | null
  modificationTime: string | Date | number
}> => {
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  const folder = await ndexClient.files.getFolder(folderId)
  return {
    uuid: folder.externalId ?? folder.uuid ?? folderId,
    name: folder.name ?? '',
    parent: folder.parent ?? null,
    modificationTime: folder.modificationTime ?? '',
  }
}

/**
 * Resolves a shortcut to its target.
 *
 * @param shortcutId - Shortcut UUID
 * @param accessToken - Authentication token
 * @param ndexUrl - Optional NDEx base URL
 * @returns Promise resolving to the shortcut's target info
 */
export const resolveShortcut = async (
  shortcutId: string,
  accessToken: string,
  ndexUrl?: string,
): Promise<{ target: string; targetType: string } | null> => {
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  try {
    const shortcut = await ndexClient.files.getShortcut(shortcutId)
    if (shortcut?.target) {
      return {
        target: shortcut.target,
        targetType: shortcut.targetType ?? 'NETWORK',
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Maps a raw API file list item to our internal NdexFileItem type.
 */
const mapFileListItem = (item: any): NdexFileItem => ({
  uuid: item.uuid,
  name: item.name ?? '',
  type: item.type ?? 'NETWORK',
  modificationTime: item.modificationTime,
  owner: item.owner,
  ownerUUID: item.ownerUUID ?? item.owner_id,
  visibility: item.visibility,
  edges: item.edges,
  permission: item.permission,
  attributes: {
    ...item.attributes,
    isReadOnly: item.isReadOnly,
    isValid: item.isValid,
    target_type: item.attributes?.target_type,
    target_status: item.attributes?.target_status,
  },
})
