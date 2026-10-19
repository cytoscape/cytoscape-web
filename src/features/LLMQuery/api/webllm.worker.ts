import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm'

// Runs the WebLLM engine off the main thread, so downloading, compiling and
// generating never freeze the network view. The main thread talks to it
// through WebWorkerMLCEngine (see webllm.ts).
const handler = new WebWorkerMLCEngineHandler()

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg)
}
