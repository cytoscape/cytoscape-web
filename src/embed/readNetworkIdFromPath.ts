import { IdType } from '@/models/IdType'

/**
 * Return the NDEx network UUID from an `/embed/<uuid>` path, or undefined
 * when the path has no UUID after `embed/`. Any base path before `embed/`
 * is ignored.
 */
export const readNetworkIdFromPath = (pathname: string): IdType | undefined => {
  const match = pathname.match(/\/embed\/([^/]+)\/?$/)
  return match ? decodeURIComponent(match[1]) : undefined
}
