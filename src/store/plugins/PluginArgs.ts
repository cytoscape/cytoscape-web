import { useMessageStore, MessageStore } from '../MessageStore'
import { useLayoutStore, LayoutStore } from '../LayoutStore'
import { useNetworkStore, NetworkStore } from '../NetworkStore'
import {
  useNetworkSummaryStore,
  NetworkSummaryStore,
} from '../NetworkSummaryStore'
import {
  useRendererFunctionStore,
  RendererFunctionStore,
} from '../RendererFunctionStore'
import { useTableStore, TableStore } from '../TableStore'
import { useUiStateStore, UiStateStore } from '../UiStateStore'
import { useViewModelStore, ViewModelStore } from '../ViewModelStore'
import { useVisualStyleStore, VisualStyleStore } from '../VisualStyleStore'
import { useWorkspaceStore, WorkspaceStore } from '../WorkspaceStore'
import { useCredentialStore, CredentialStore } from '../CredentialStore'

import { UseBoundStore, StoreApi } from 'zustand'

import { WithImmer } from './WithImmer'

export interface PluginArgs {
  useMessageStore: UseBoundStore<WithImmer<StoreApi<MessageStore>>>
  useLayoutStore: UseBoundStore<WithImmer<StoreApi<LayoutStore>>>
  useNetworkStore: UseBoundStore<WithImmer<StoreApi<NetworkStore>>>
  useNetworkSummaryStore: UseBoundStore<
    WithImmer<StoreApi<NetworkSummaryStore>>
  >
  useRendererFunctionStore: UseBoundStore<
    WithImmer<StoreApi<RendererFunctionStore>>
  >
  useTableStore: UseBoundStore<WithImmer<StoreApi<TableStore>>>
  useUiStateStore: UseBoundStore<WithImmer<StoreApi<UiStateStore>>>
  useViewModelStore: UseBoundStore<WithImmer<StoreApi<ViewModelStore>>>
  useVisualStyleStore: UseBoundStore<WithImmer<StoreApi<VisualStyleStore>>>
  useWorkspaceStore: UseBoundStore<WithImmer<StoreApi<WorkspaceStore>>>
  useCredentialStore: UseBoundStore<WithImmer<StoreApi<CredentialStore>>>
}

export const pluginArgs: PluginArgs = {
  useMessageStore,
  useLayoutStore,
  useNetworkStore,
  useNetworkSummaryStore,
  useRendererFunctionStore,
  useTableStore,
  useUiStateStore,
  useViewModelStore,
  useVisualStyleStore,
  useWorkspaceStore,
  useCredentialStore,
}
