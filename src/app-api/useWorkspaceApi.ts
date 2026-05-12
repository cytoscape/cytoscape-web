// src/app-api/useWorkspaceApi.ts

import type { WorkspaceApi } from './core/workspaceApi'
import { workspaceApi } from './core/workspaceApi'

export type { WorkspaceApi }
export const useWorkspaceApi = (): WorkspaceApi => workspaceApi
