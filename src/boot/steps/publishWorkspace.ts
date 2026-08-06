import { markReady } from '@/app-api/core/ready'
import { initEventBus } from '@/app-api/event-bus/initEventBus'
import { useMessageStore } from '@/data/hooks/stores/MessageStore'
import { useNetworkSummaryStore } from '@/data/hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { MessageSeverity } from '@/models/MessageModel'
import { markBoot } from '../metrics/bootMarks'
import { markWorkspaceHydrated } from '../workspaceHydrated'
import type { WorkspaceDraft } from './appShellBootContext'

/**
 * Publishes the assembled workspace to the stores and opens the app up to the
 * outside world.
 *
 * This step must run even when the deep-link or import steps failed — it is
 * what unblocks `waitForWorkspaceHydration()` (the App Manager parks on it for
 * up to 10s) and what makes the app usable at all. The runner guarantees that
 * by never letting an earlier phase's rejection escape.
 */
export const publishWorkspace = (draft: WorkspaceDraft): void => {
  const { workspace, summaries, errors } = draft

  if (errors.length > 0) {
    // Persistent: the snackbar host lives inside WorkspaceEditor, which may
    // not have mounted yet when this runs.
    useMessageStore.getState().addMessage({
      message: errors.join('\n'),
      persistent: true,
      severity: MessageSeverity.ERROR,
    })
  }

  useNetworkSummaryStore.getState().addAll(summaries)
  useWorkspaceStore.getState().set(workspace)
  markBoot('workspace-hydrated')

  // After hydration, so store subscriptions do not emit spurious
  // network:created / network:switched events for the initial state.
  initEventBus()
  // Signals external consumers (extensions, LLM agents) that window.CyWebApi
  // and the event bus are ready. The flag is set FIRST so a consumer that mounts
  // after this point can still tell hydration happened — the event itself is
  // gone by then (see `workspaceHydrated.ts`).
  markWorkspaceHydrated()
  window.dispatchEvent(new CustomEvent('cywebapi:ready'))
  // Resolve any CyWebApi.whenReady() promises (idempotent). ready.ts also
  // listens for the event above, but calling directly keeps readiness correct
  // for hosts where that listener never installed (non-DOM environments).
  markReady()
}
