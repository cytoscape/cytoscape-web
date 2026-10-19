import type { WebWorkerMLCEngine } from '@mlc-ai/web-llm'

import { logApi } from '../../../debug'
import { LLMModel } from '../model/LLMModel'
import { findWebLLMModel, webLLMAppConfig } from '../model/WebLLMModel'

export interface WebLLMLoadProgress {
  // 0..1
  readonly progress: number
  readonly text: string
}

interface EngineSession {
  readonly worker: Worker
  readonly modelId: LLMModel
  // Resolves once the model is loaded and ready to generate
  readonly engine: Promise<WebWorkerMLCEngine>
}

// One engine, one model at a time: each model needs gigabytes of GPU memory.
let session: EngineSession | undefined

const disposeSession = (): void => {
  if (session === undefined) {
    return
  }
  // Terminating the worker aborts a load in flight and frees the GPU memory
  // the model holds; the downloaded files stay in the browser cache.
  session.worker.terminate()
  session = undefined
}

const startSession = (
  modelId: LLMModel,
  onProgress: (report: WebLLMLoadProgress) => void,
): EngineSession => {
  const worker = new Worker(new URL('./webllm.worker.ts', import.meta.url), {
    type: 'module',
  })
  let started: EngineSession | undefined
  const engine = (async () => {
    const { WebWorkerMLCEngine } = await import('@mlc-ai/web-llm')
    const created = new WebWorkerMLCEngine(worker, {
      appConfig: webLLMAppConfig,
      initProgressCallback: (report) => {
        // A replaced session may still report; only the current one counts
        if (session === started) {
          onProgress({ progress: report.progress, text: report.text })
        }
      },
    })
    await created.reload(modelId)
    return created
  })()
  started = { worker, modelId, engine }
  engine.catch((e: unknown) => {
    logApi.error(`[${loadWebLLMModel.name}]: failed to load ${modelId}`, e)
    if (session === started) {
      disposeSession()
    }
  })
  return started
}

/**
 * Loads a curated model into a Web Worker engine, downloading it on first
 * use. Asking for the model that is already loaded (or loading) returns the
 * same promise; asking for another model drops the current one first.
 */
export const loadWebLLMModel = async (
  modelId: LLMModel,
  onProgress: (report: WebLLMLoadProgress) => void,
): Promise<void> => {
  if (findWebLLMModel(modelId) === undefined) {
    throw new Error(`${modelId} is not a WebLLM model`)
  }
  if (session?.modelId !== modelId) {
    disposeSession()
    session = startSession(modelId, onProgress)
  }
  await session.engine
}

/** The model currently loaded or loading, if any. */
export const getWebLLMModelId = (): LLMModel | undefined => session?.modelId

const CONTEXT_EXCEEDED = 'Prompt tokens exceed context window size'
const DEVICE_LOST = 'device was lost'

/**
 * Sends one user message to the loaded in-browser model. Errors cross the
 * worker boundary as plain messages, so known ones are matched by text.
 */
export const chatWithWebLLM = async (
  message: string,
  modelId: LLMModel,
): Promise<string> => {
  if (session?.modelId !== modelId) {
    throw new Error(
      `${modelId} is not loaded. Choose it in Analysis -> LLM Query Options.`,
    )
  }
  const engine = await session.engine
  try {
    const reply = await engine.chat.completions.create({
      messages: [{ role: 'user', content: message }],
      model: modelId,
    })
    return reply.choices[0]?.message.content ?? ''
  } catch (e) {
    const text = e instanceof Error ? e.message : String(e)
    logApi.error(`[${chatWithWebLLM.name}]: WebLLM error:`, e)
    if (text.includes(CONTEXT_EXCEEDED)) {
      throw new Error(
        'The gene list is too long for the in-browser model (its context window is 4,096 tokens). Select fewer genes, or use another provider.',
      )
    }
    if (text.includes(DEVICE_LOST)) {
      // The engine is unusable after this; the next load starts fresh
      disposeSession()
      throw new Error(
        'The GPU stopped responding, most likely out of memory. Choose a smaller model in LLM Query Options.',
      )
    }
    throw e
  }
}

/** Frees the GPU memory of the loaded model; its download stays cached. */
export const unloadWebLLMModel = (): void => {
  disposeSession()
}
