// Entry point: paints the boot shell immediately (this chunk is tiny and
// preloaded, so it runs long before react-dom and the shared chunks arrive),
// then dynamically imports and executes init.tsx.
//
// In production builds bootShellPlugin injects src/boot/shell/bootShellEntry
// as an even earlier script, so showBootShell() here is a no-op; in dev this
// is the paint.
import { showBootShell } from './boot/shell/showBootShell'

showBootShell()

import('./init')
