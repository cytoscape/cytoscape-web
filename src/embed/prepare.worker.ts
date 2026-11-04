import { NdexRequestError } from './ndexRequests'
import { createPrepareHandler, PrepareMessage } from './prepareHandler'

/**
 * The prepare worker: downloads, converts and styles networks off the
 * page's main thread (preparer.ts posts the work). Messages in are
 * `{ id, message }` or `{ abort: id }`; messages out are
 * `{ id, ok, result | error }`.
 */

const handle = createPrepareHandler()
const controllers = new Map<number, AbortController>()

self.onmessage = async (
  event: MessageEvent<
    { id: number; message: PrepareMessage } | { abort: number }
  >,
) => {
  const data = event.data
  if ('abort' in data) {
    controllers.get(data.abort)?.abort()
    return
  }
  const controller = new AbortController()
  controllers.set(data.id, controller)
  try {
    const result = await handle(data.message, controller.signal)
    self.postMessage({ id: data.id, ok: true, result })
  } catch (error) {
    self.postMessage({
      id: data.id,
      ok: false,
      error: {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : String(error),
        status: error instanceof NdexRequestError ? error.status : undefined,
      },
    })
  } finally {
    controllers.delete(data.id)
  }
}
