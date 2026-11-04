import { logApi } from '@/debug'

import { NdexRequestError } from './ndexRequests'
import {
  createPrepareHandler,
  InvalidNetworkError,
  PrepareMessage,
} from './prepareHandler'

export interface PrepareJob<T> {
  promise: Promise<T>
  /** Stops the job's download; its promise then rejects. */
  abort: () => void
}

interface Pending {
  message: PrepareMessage
  resolve: (result: any) => void
  reject: (error: unknown) => void
}

interface WorkerError {
  name: string
  message: string
  status?: number
}

/** null once a worker has failed to start or crashed. */
let worker: Worker | null | undefined
let nextId = 0
const pending = new Map<number, Pending>()
let onPage: ReturnType<typeof createPrepareHandler> | undefined

const toError = ({ name, message, status }: WorkerError): Error => {
  if (status !== undefined) return new NdexRequestError(status, message)
  if (name === 'InvalidNetworkError') return new InvalidNetworkError(message)
  const error = new Error(message)
  error.name = name
  return error
}

const runOnPage = <T>(message: PrepareMessage): PrepareJob<T> => {
  onPage ??= createPrepareHandler()
  const controller = new AbortController()
  return {
    promise: onPage(message, controller.signal) as Promise<T>,
    abort: () => controller.abort(),
  }
}

const startWorker = (): Worker | null => {
  if (worker !== undefined) return worker
  try {
    worker = new Worker(new URL('./prepare.worker.ts', import.meta.url), {
      type: 'module',
    })
  } catch (error) {
    logApi.warn('[embed] no prepare worker; preparing on the page', error)
    worker = null
    return worker
  }
  worker.onmessage = (
    event: MessageEvent<{
      id: number
      ok: boolean
      result?: unknown
      error?: WorkerError
    }>,
  ) => {
    const { id, ok, result, error } = event.data
    const job = pending.get(id)
    if (job === undefined) return
    pending.delete(id)
    if (ok) job.resolve(result)
    else job.reject(toError(error!))
  }
  worker.onerror = (event) => {
    logApi.warn('[embed] prepare worker failed; preparing on the page', event)
    worker?.terminate()
    worker = null
    // Finish what the worker dropped on the page
    pending.forEach((job) => {
      const retry = runOnPage(job.message)
      retry.promise.then(job.resolve, job.reject)
    })
    pending.clear()
  }
  return worker
}

/**
 * Hand `message` to the prepare worker (prepare.worker.ts), or run it on
 * the page when no worker can start. The result arrives as a structured
 * clone.
 */
export const prepare = <T>(message: PrepareMessage): PrepareJob<T> => {
  const target = startWorker()
  if (target === null) return runOnPage<T>(message)
  const id = nextId++
  const promise = new Promise<T>((resolve, reject) => {
    pending.set(id, { message, resolve, reject })
    target.postMessage({ id, message })
  })
  return { promise, abort: () => worker?.postMessage({ abort: id }) }
}
