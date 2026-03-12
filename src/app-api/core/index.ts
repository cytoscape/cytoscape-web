// src/app-api/core/index.ts
// Assembles all 10 domain API objects into the CyWebApi object.
// Assigned to window.CyWebApi in src/init.tsx.

import type { ContextMenuApi } from './contextMenuApi'
import { contextMenuApi } from './contextMenuApi'
import type { ElementApi } from './elementApi'
import { elementApi } from './elementApi'
import type { ExportApi } from './exportApi'
import { exportApi } from './exportApi'
import type { LayoutApi } from './layoutApi'
import { layoutApi } from './layoutApi'
import type { NetworkApi } from './networkApi'
import { networkApi } from './networkApi'
import type { SelectionApi } from './selectionApi'
import { selectionApi } from './selectionApi'
import type { TableApi } from './tableApi'
import { tableApi } from './tableApi'
import type { ViewportApi } from './viewportApi'
import { viewportApi } from './viewportApi'
import type { VisualStyleApi } from './visualStyleApi'
import { visualStyleApi } from './visualStyleApi'
import type { WorkspaceApi } from './workspaceApi'
import { workspaceApi } from './workspaceApi'

export interface CyWebApiType {
  element: ElementApi
  network: NetworkApi
  selection: SelectionApi
  viewport: ViewportApi
  table: TableApi
  visualStyle: VisualStyleApi
  layout: LayoutApi
  export: ExportApi
  workspace: WorkspaceApi
  contextMenu: ContextMenuApi
}

export const CyWebApi: CyWebApiType = {
  element: elementApi,
  network: networkApi,
  selection: selectionApi,
  viewport: viewportApi,
  table: tableApi,
  visualStyle: visualStyleApi,
  layout: layoutApi,
  export: exportApi,
  workspace: workspaceApi,
  contextMenu: contextMenuApi,
}
