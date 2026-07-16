# Debugging Guide for Cytoscape Web

This guide explains how to enable and use debug logging in Cytoscape Web using the [`debug`](https://github.com/debug-js/debug) package. You will learn how to control debug output via configuration and browser settings, and how to filter logs by namespace and log level.

---

## 1. Enable and Disable Debug Mode

Debug mode follows the Vite build mode by default:

- Development builds start with debug mode enabled.
- Production builds start with debug mode disabled.

Press the backtick/tilde key (the key immediately below Escape on a US
keyboard) to toggle debug mode at runtime. The choice is saved in
`localStorage` under `cyweb-debug-enabled`, so it survives reloads and overrides
the build default. The shortcut is ignored while typing in form fields.

Enabling debug mode activates all structured logging namespaces and exposes
registered developer tools under `window.debug`. Disabling it removes those
tools and stops structured logging.

---

## 2. Debug Namespaces and Log Levels

Debug messages are organized by **namespace** and **log level**.  
Namespaces represent different parts of the application (e.g., `db`, `store`, `api`, `ui`, etc.), and log levels indicate the severity (`info`, `warn`, `error`).

**Examples:**

- `db:info` — Database info messages
- `store:warn` — Store warning messages
- `api:error` — API error messages

**Available namespaces:**

- `db`
- `store`
- `api`
- `app`
- `ui`
- `startup`
- `performance`

**Available levels:**

- `info`
- `warn`
- `error`

---

## 3. Setting Debug Namespaces in the Browser

You can control which debug messages appear in the browser console by setting the `localStorage.debug` value.

### General principles

Use the structured debug logger rather than `console.log`.

### Enable All Debug Logs

Open your browser's DevTools console and enter:

```js
localStorage.setItem('cyweb-debug-enabled', 'true')
```

### Enable Specific Namespaces

To only show logs for certain namespaces and levels, specify them as a comma-separated list:

```js
localStorage.debug = 'db:*,store:info,api:error'
```

- `db:*` — All database logs (info, warn, error)
- `store:info` — Only info logs for the store
- `api:error` — Only error logs for the API

### Disable Debug Logging

To turn off all debug logs:

```js
localStorage.setItem('cyweb-debug-enabled', 'false')
```

---

## 4. Example Usage in Code

```typescript
import { logDb } from './debug'

logDb.info('Database opened successfully')
logDb.warn('Database response is slow')
logDb.error('Failed to open database', error)
```

---

## 5. How Namespace Filtering Works

- Only messages from enabled namespaces and levels will appear in the console.
- You can combine multiple namespaces and levels for fine-grained control.
- The backtick/tilde toggle takes effect immediately and persists across page reloads.
- Direct changes to `localStorage.debug` control namespace filtering but do not toggle `window.debug` tools.
- Reload after directly changing `cyweb-debug-enabled`; use the keyboard shortcut for an immediate change.

---

## 6. Accessing Application Objects via `window`

For debugging and inspection, some core objects are exposed on the global `window` object. This allows you to interact with them directly from the browser console.

### Cytoscape.js Instance

When debug mode is enabled, the Cytoscape.js instance is available as `window.debug.cy`.  
This lets you run commands and inspect the network directly:

```js
window.debug.cy.elements() // Get all elements
window.debug.cy.layout({ name: 'cose' }).run() // Run a layout
window.debug.cy.zoom(2) // Set zoom level
window.debug.cy.pan({ x: 100, y: 100 }) // Pan the viewport
```

### Other Exposed Objects

Depending on your app setup, you may also find other objects such as:

```js
window.debug.cy // cy.js renderer
window.debug.db // IndexedDB instance
// ...
```

// ...

### Exposing Objects to the `window` for Debugging

You can make any object or variable accessible from the browser console by attaching it to the global `window` object. This is useful for debugging and live inspection.

First, add fields to the window in `custom.d.ts`

custom.d.ts:

```ts
// global variables for debugging
interface Window {
  cy: any
  db: any
  debug: any
}
```

**Example:**

```typescript
// Make the database instance available globally
registerDebugTool('db', db)

// Expose Cytoscape.js instance
registerDebugTool('cy', cy)
```

Now you can access these objects directly in the browser console, e.g. `window.debug.db` or `window.debug.cy`.

---

## 7. Troubleshooting

- If you do not see debug logs, press backtick/tilde and ensure the browser console's verbose level is visible.
- **Important:**  
  In your browser's DevTools, make sure the "Verbose" (or "Info") log level is enabled.  
  Some browsers filter out debug output by default—enable "Verbose" to see all debug messages.
- Production starts with debug disabled unless a saved user override enables it.
- why-did-you-render is loaded only in development builds and is omitted from production bundles.
- Use the browser console to inspect global objects via `window`.

---

## References

- [`debug` package documentation](https://github.com/debug-js/debug)
- Cytoscape Web source code: `src/debug.ts`

---
