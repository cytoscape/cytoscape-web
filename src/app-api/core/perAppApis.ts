// src/app-api/core/perAppApis.ts
//
// The single place a per-app API object is assembled.
//
// Three call sites need one — app mount, the side-panel tab host, and the apps
// menu — and each previously spread `CyWebApi` and overrode the per-app
// factories inline. Adding a per-app domain then meant editing three files, and
// missing one produced an app that silently lacked that domain.
//
// React-free by construction: every factory it calls lives in core/.

import type { AppContextApis } from '../types/AppContext'
import { CyWebApi } from './index'
import { createContextMenuApi } from './contextMenuApi'
import { createNodeGraphicsApi } from './nodeGraphicsApi'
import { createResourceApi } from './resourceApi'

/**
 * Build the per-app `AppContextApis` for `appId`.
 *
 * Starts from the anonymous `CyWebApi` surface, then overrides every domain
 * whose registrations must be attributed to an app and cleaned up when that app
 * is disabled. Anything registered through these factories carries `appId` and
 * is removed by `AppCleanupRegistry` on deactivation.
 */
export function buildPerAppApis(appId: string): AppContextApis {
  return {
    ...CyWebApi,
    resource: createResourceApi(appId),
    contextMenu: createContextMenuApi(appId),
    nodeGraphics: createNodeGraphicsApi(appId),
  }
}
