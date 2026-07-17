// Standalone entry emitted as its own chunk by bootSplashPlugin
// (vite.config.ts) and injected as the first module script in index.html.
// Its import graph is just the splash, so it executes while the Module
// Federation bootstrap is still downloading the shared chunks.
import { showBootSplash } from './bootSplash'

showBootSplash()
