import type { AppCatalogEntry } from '@/models/AppModel/AppCatalogEntry'
import { AppType } from '@/models/AppModel/AppType'
import {
  parseServiceMetadata,
  serviceMetadataIfMarked,
} from '@/models/AppModel/serviceMetadataSchema'
import type { ServiceMetadata } from '@/models/AppModel/ServiceMetadata'
import { parseSingleEntryManifest } from './installGate'

/**
 * What a fetched `?installApp=` payload turned out to be.
 *
 * Pure and framework-free, like the rest of this directory: `?installApp=`
 * accepts one URL for both app kinds, so the payload behind it has to be
 * resolved before anything is installed or shown to the user.
 */
export type ClassifiedInstallPayload =
  | { type: typeof AppType.Client; entry: AppCatalogEntry }
  | { type: typeof AppType.Service; metadata: ServiceMetadata }

/**
 * Decide whether a fetched payload is a React app manifest or service-app
 * metadata. Returns undefined when it is neither — the caller reports that.
 *
 * The two shapes are structurally disjoint, so no change to either published
 * format is required:
 *
 * | | React app manifest | Service app metadata |
 * | --- | --- | --- |
 * | Top level | array (or a single entry object) | object |
 * | Required | `url` (the remoteEntry.js) | no `url` |
 * | Distinctive | `id`, `tags` | `cyWebActions`, `cyWebMenuItem`, `serviceInputDefinition` |
 *
 * Order of resolution:
 *
 * 1. An array is a manifest. This is the only shape the App Store serves today,
 *    so existing `?installApp=` links keep their exact behavior.
 * 2. On a bare object, an explicit `type` field wins over structure. Optional,
 *    because making it required would break every manifest already published on
 *    apps-stage.cytoscape.org until the App Store republishes them.
 * 3. A service marker (`cyWebActions` / `cyWebMenuItem` /
 *    `serviceInputDefinition`) means service.
 * 4. Otherwise try the manifest parser on a single-object payload — it requires
 *    a valid `url`, which service metadata never has.
 *
 * Rules 2-4 handle a bare object rather than an array because a manifest may be
 * served either way (the React example in cytoscape-web#639 is a single object).
 *
 * `type` is deliberately not consulted inside an array. A service
 * classification has to carry metadata, and a manifest entry carries only a
 * `url` — resolving `type: 'service'` there would mean fetching that URL, which
 * this function cannot do. If the App Store ever lists service apps in a
 * manifest, that fetch belongs in the caller, not here.
 */
export const classifyInstallPayload = (
  data: unknown,
): ClassifiedInstallPayload | undefined => {
  if (Array.isArray(data)) {
    const entry = parseSingleEntryManifest(data)
    return entry === undefined ? undefined : { type: AppType.Client, entry }
  }

  if (typeof data !== 'object' || data === null) {
    return undefined
  }

  const declaredType = (data as { type?: unknown }).type

  if (declaredType === AppType.Service) {
    const metadata = parseServiceMetadata(data)
    return metadata === undefined
      ? undefined
      : { type: AppType.Service, metadata }
  }

  if (declaredType === AppType.Client) {
    const entry = parseSingleEntryManifest([data])
    return entry === undefined ? undefined : { type: AppType.Client, entry }
  }

  const marked = serviceMetadataIfMarked(data)
  if (marked !== undefined) {
    return { type: AppType.Service, metadata: marked }
  }

  const entry = parseSingleEntryManifest([data])
  return entry === undefined ? undefined : { type: AppType.Client, entry }
}
