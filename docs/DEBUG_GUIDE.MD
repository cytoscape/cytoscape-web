# Debugging Guide for Cytoscape Web

This guide explains how to enable and use debug logging in Cytoscape Web using the [`debug`](https://github.com/debug-js/debug) package. You will learn how to control debug output via configuration and browser settings, and how to filter logs by namespace and log level.

---

## 1. Enable Debug Mode via `config.json`

To globally enable debug logging, set the `debug` flag in your configuration file:

```json
{
  ...
  "debug": true
}
```

When `debug` is set to `true`, all debug namespaces will be enabled automatically at startup.

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

Use `console.log` for temporary debugging during development, but remove these before committing. For permanent or shared logs, use the structured debug logger.

### Enable All Debug Logs

Open your browser's DevTools console and enter:

```js
localStorage.debug = '*'
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
localStorage.debug = ''
```

---

## 4. Example Usage in Code

```typescript
import { logDb } from './debug/index'

logDb.info('Database opened successfully')
logDb.warn('Database response is slow')
logDeb.error('Failed to open database', error)
```

---

## 5. How Namespace Filtering Works

- Only messages from enabled namespaces and levels will appear in the console.
- You can combine multiple namespaces and levels for fine-grained control.
- Changes to `localStorage.debug` take effect immediately and persist across page reloads.

---

## 6. Accessing Application Objects via `window`

For debugging and inspection, some core objects are exposed on the global `window` object. This allows you to interact with them directly from the browser console.

### Cytoscape.js Instance

When debug mode is enabled, the Cytoscape.js instance is available as `window.cy`.  
This lets you run commands and inspect the network directly:

```js
window.cy.elements() // Get all elements
window.cy.layout({ name: 'cose' }).run() // Run a layout
window.cy.zoom(2) // Set zoom level
window.cy.pan({ x: 100, y: 100 }) // Pan the viewport
```

### Other Exposed Objects

Depending on your app setup, you may also find other objects such as:

```js
window.cy // cy.js renderer
window.db // indexeddb instance
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
if (config.debug) {
  ;(window as any).debug.db = db
}

// Expose Cytoscape.js instance
;(window as any).debug.cy = cy
```

Now you can access these objects directly in the browser console, e.g. `window.debug.db`, `window.debug.cy`, or `window.store`.

---

## 7. Troubleshooting

- If you do not see debug logs, check that `config.debug` is set to `true` and that `localStorage.debug` is configured correctly.
- **Important:**  
  In your browser's DevTools, make sure the "Verbose" (or "Info") log level is enabled.  
  Some browsers filter out debug output by default—enable "Verbose" to see all debug messages.
- For production, set `config.debug` to `false` and clear `localStorage.debug` to disable debug output.
- Use the browser console to inspect global objects via `window`.

---

## References

- [`debug` package documentation](https://github.com/debug-js/debug)
- Cytoscape Web source code: `src/debug/index.ts`

---
