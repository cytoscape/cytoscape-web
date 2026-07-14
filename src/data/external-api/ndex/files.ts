/**
 * NDEx Files API
 *
 * Provides folder and file search operations for the NDEx v3 file system.
 * Used by LoadFromNdexDialog for folder browsing and search.
 *
 * @module api/ndex/files
 */

import { getNdexClient } from './client'
import { fetchNdexSummaries } from './networkSummary'

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
  nodes?: number
  nodeCount?: number
  cx2FileSize?: number
  subnetworkIds?: string[]
  permission?: string
  /**
   * For SHORTCUT items, the UUID of the network or folder the shortcut points
   * to. Undefined for plain networks and folders. Use `getNetworkIdForFileItem`
   * to resolve the effective id for loading/navigation.
   */
  targetId?: string
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
    files: ((result as any)?.files ?? (result as any)?.ResultList ?? [])
      .filter((item: any) => item != null && typeof item === 'object')
      .map(mapFileListItem),
    numFound: (result as any)?.numFound ?? 0,
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
  const items = await ndexClient.files.getFolderList(id)
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
const mapFileListItem = (item: any): NdexFileItem => {
  const attrs = item.attributes ?? {}
  const nodeCount = item.nodes ?? item.nodeCount ?? attrs.nodes ?? attrs.nodeCount
  const edgeCount = item.edges ?? item.edgeCount ?? attrs.edges ?? attrs.edgeCount
  const cx2FileSize = item.cx2FileSize ?? attrs.cx2FileSize
  const subnetworkIds = item.subnetworkIds ?? attrs.subnetworkIds

  return {
    uuid: item.uuid ?? item.externalId,
    name: item.name ?? '',
    type: item.type ?? 'NETWORK',
    modificationTime: item.modificationTime,
    owner: item.owner,
    ownerUUID: item.ownerUUID ?? item.owner_id,
    visibility: item.visibility,
    edges: edgeCount,
    nodes: nodeCount,
    nodeCount: nodeCount,
    cx2FileSize: cx2FileSize,
    subnetworkIds: subnetworkIds,
    permission: item.permission,
    targetId: attrs.target,
    attributes: {
      ...attrs,
      isReadOnly: item.isReadOnly,
      isValid: item.isValid,
      target_type: attrs.target_type,
      target_status: attrs.target_status,
      nodeCount: nodeCount,
      cx2FileSize: cx2FileSize,
      subnetworkIds: subnetworkIds,
    },
  }
}

/**
 * Resolves the effective network/folder id for a file item.
 *
 * For SHORTCUT items this is the target's UUID (so selecting/opening a shortcut
 * acts on the network or folder it points to, not the shortcut record itself).
 * For plain networks and folders this is just the item's own UUID.
 */
export const getNetworkIdForFileItem = (item: NdexFileItem): string =>
  item.targetId ?? item.uuid

/**
 * Enriches network shortcuts with metadata from their target network summaries.
 *
 * Shortcut items returned by NDEx don't carry full network metrics (node count,
 * file size, etc.), so their table rows would otherwise display zeros. This
 * batch-fetches the summaries of all network shortcut targets in one request and
 * copies the relevant fields onto the shortcut items.
 *
 * Loading/selection already works via `targetId` alone; this only improves the
 * displayed metrics. If the summary fetch fails, the original items are returned
 * unchanged so browsing is never blocked.
 *
 * @param items - File items from a search or folder listing
 * @param accessToken - Optional authentication token
 * @param ndexUrl - Optional NDEx base URL
 * @returns Promise resolving to items with network shortcuts enriched
 */
export const enrichShortcutsWithTargetSummaries = async (
  items: NdexFileItem[],
  accessToken?: string,
  ndexUrl?: string,
): Promise<NdexFileItem[]> => {
  const networkShortcutTargets = items
    .filter(
      (item) =>
        item.type === 'SHORTCUT' &&
        item.attributes?.target_type === 'NETWORK' &&
        typeof item.targetId === 'string',
    )
    .map((item) => item.targetId as string)

  if (networkShortcutTargets.length === 0) {
    return items
  }

  try {
    const summaries = await fetchNdexSummaries(
      Array.from(new Set(networkShortcutTargets)),
      accessToken,
      ndexUrl,
    )
    const summaryByExternalId = new Map(
      summaries.map((summary) => [summary.externalId, summary]),
    )

    return items.map((item) => {
      if (item.type !== 'SHORTCUT' || item.targetId === undefined) {
        return item
      }
      const summary = summaryByExternalId.get(item.targetId)
      if (summary === undefined) {
        return item
      }
      return {
        ...item,
        nodes: summary.nodeCount,
        nodeCount: summary.nodeCount,
        edges: summary.edgeCount,
        cx2FileSize: summary.cx2FileSize,
        subnetworkIds: (summary.subnetworkIds ?? []).map(String),
        visibility: summary.visibility ?? item.visibility,
      }
    })
  } catch {
    return items
  }
}
