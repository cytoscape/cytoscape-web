// Entry point: paints the framework-free boot splash immediately (this
// chunk is tiny and preloaded, so it runs long before react-dom and the
// shared chunks arrive), then dynamically imports and executes init.tsx.
import { showBootSplash } from './init/bootSplash'

showBootSplash()

import('./init')
