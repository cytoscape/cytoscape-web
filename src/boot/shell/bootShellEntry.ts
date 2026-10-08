// Standalone entry emitted as its own chunk by bootShellPlugin
// (vite.config.ts) and injected as the first module script in index.html.
// Its import graph is just the shell markup, so it executes and paints while
// the Module Federation bootstrap is still downloading the shared chunks.
import { showBootShell } from './showBootShell'

showBootShell()
