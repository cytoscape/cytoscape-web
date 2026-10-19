import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { MessageSeverity } from '../../../models/MessageModel'
import { LLMModel } from '../model/LLMModel'
import {
  findWebLLMModel,
  formatModelSize,
  WebLLMStatus,
} from '../model/WebLLMModel'
import { useLLMQueryStore } from '../store'
import {
  chatWithWebLLM,
  getWebLLMModelId,
  loadWebLLMModel,
  unloadWebLLMModel,
  WebLLMLoadProgress,
} from './webllm'

// WebLLM reports progress many times a second; the store only needs a new
// value when the shown percentage moves, or the stage text after a pause.
const PROGRESS_TEXT_INTERVAL_MS = 1000

const isCurrent = (modelId: LLMModel): boolean => {
  const status = useLLMQueryStore.getState().webLLMStatus
  return status.state !== 'idle' && status.modelId === modelId
}

const errorText = (e: unknown): string =>
  e instanceof Error ? e.message : String(e)

/**
 * Starts loading an in-browser model in the background and tracks it in the
 * store, so the run buttons and the result panel can show progress. Does
 * nothing when that model is already loading or loaded.
 */
export const startWebLLMModelLoad = async (
  modelId: LLMModel,
): Promise<void> => {
  const { webLLMStatus, setWebLLMStatus } = useLLMQueryStore.getState()
  const { addMessage } = useMessageStore.getState()
  if (
    (webLLMStatus.state === 'loading' || webLLMStatus.state === 'ready') &&
    webLLMStatus.modelId === modelId
  ) {
    return
  }
  const option = findWebLLMModel(modelId)
  const label = option?.label ?? modelId

  setWebLLMStatus({ state: 'loading', modelId, progress: 0, text: 'Starting' })
  addMessage({
    message: `Loading ${label} in the background${
      option === undefined
        ? ''
        : ` (a ${formatModelSize(option.downloadMB)} download the first time)`
    }. Progress is shown in the LLM Query panel.`,
    duration: 6000,
    severity: MessageSeverity.INFO,
  })

  let lastPercent = -1
  let lastTextAt = 0
  const onProgress = (report: WebLLMLoadProgress): void => {
    const percent = Math.floor(report.progress * 100)
    const now = Date.now()
    if (
      percent === lastPercent &&
      now - lastTextAt < PROGRESS_TEXT_INTERVAL_MS
    ) {
      return
    }
    lastPercent = percent
    lastTextAt = now
    if (isCurrent(modelId)) {
      setWebLLMStatus({
        state: 'loading',
        modelId,
        progress: report.progress,
        text: report.text,
      })
    }
  }

  try {
    await loadWebLLMModel(modelId, onProgress)
    if (!isCurrent(modelId)) {
      return
    }
    setWebLLMStatus({ state: 'ready', modelId })
    addMessage({
      message: `${label} is ready to run LLM queries in your browser`,
      duration: 4000,
      severity: MessageSeverity.INFO,
    })
  } catch (e) {
    if (!isCurrent(modelId)) {
      return
    }
    const message = errorText(e)
    setWebLLMStatus({ state: 'error', modelId, message })
    addMessage({
      message: `Could not load ${label}: ${message}`,
      duration: 10000,
      severity: MessageSeverity.ERROR,
    })
  }
}

/** Unloads any in-browser model, for when another provider is chosen. */
export const stopWebLLM = (): void => {
  unloadWebLLMModel()
  useLLMQueryStore.getState().setWebLLMStatus({ state: 'idle' })
}

/**
 * Queries the loaded in-browser model. If the engine had to be dropped (the
 * GPU was lost), the status says so, and the user can load a model again.
 */
export const queryWebLLM = async (
  message: string,
  modelId: LLMModel,
): Promise<string> => {
  try {
    return await chatWithWebLLM(message, modelId)
  } catch (e) {
    if (getWebLLMModelId() !== modelId && isCurrent(modelId)) {
      useLLMQueryStore
        .getState()
        .setWebLLMStatus({ state: 'error', modelId, message: errorText(e) })
    }
    throw e
  }
}

/**
 * Why the in-browser provider cannot run a query yet, or undefined when the
 * chosen model is loaded. Shown as the run buttons' tooltip.
 */
export const getWebLLMBlocker = (
  status: WebLLMStatus,
  modelId: LLMModel,
): string | undefined => {
  if (status.state === 'ready' && status.modelId === modelId) {
    return undefined
  }
  const label = findWebLLMModel(modelId)?.label ?? modelId
  if (status.state === 'loading' && status.modelId === modelId) {
    return `Loading ${label} (${Math.floor(status.progress * 100)}%)...`
  }
  if (status.state === 'error' && status.modelId === modelId) {
    return `${label} failed to load (${status.message}). Choose a model again in Analysis -> LLM Query Options.`
  }
  return `Load an in-browser model in Analysis -> LLM Query Options to run LLM queries`
}
