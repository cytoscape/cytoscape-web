# UI Surface Registration — Minimal App Examples

- **Rev. 1 (3/14/2026): Keiichiro ONO and Claude Sonnet 4.6**

Concrete code samples showing the minimum viable plugin app that registers a
panel, an app-menu item, and a context menu item using the runtime registration
API defined in [ui-surface-registration-specification.md](../specifications/ui-surface-registration-specification.md).

All three surface types follow the same core pattern:

1. Define a stable `appState.ts` module to hold the `AppContextApis` reference.
2. Implement `mount()` on the `CyApp` object to perform registrations.
3. Implement `unmount()` (or rely on host cleanup) to remove registrations.

**Related documents:**

- [ui-surface-registration-specification.md](../specifications/ui-surface-registration-specification.md) — Full design
- [app-api-use-case-examples.md](./app-api-use-case-examples.md) — Other API use cases

---

## File layout

A plugin app that uses all three surface types needs the following files:

```text
src/
├── appState.ts              ← Holds apis reference; shared by all components
├── index.ts                 ← CyApp definition with mount() / unmount()
├── panels/
│   └── MyPanel.tsx          ← React component rendered in the right panel
└── menuItems/
    └── MyMenuItem.tsx       ← React component rendered in the Apps menu
```

Context menu items do not need a component — they register a handler function.

---

## 1. `appState.ts` — shared lifecycle module

This file is the single place that stores the `AppContextApis` object received
in `mount()`. React components that need to call an API import `getApis()` from
here instead of using a hook.

```typescript
// src/appState.ts
import type { AppContextApis } from 'cyweb/ApiTypes'

let _apis: AppContextApis | null = null

/** Called once from mount() before any component renders. */
export const _setApis = (apis: AppContextApis): void => {
  _apis = apis
}

/**
 * Returns the apis object. Throws if called before mount().
 * Components should only call this inside event handlers, not at render time.
 */
export const getApis = (): AppContextApis => {
  if (_apis === null) {
    throw new Error('getApis() called before mount()')
  }
  return _apis
}

/** Called from unmount() to clear the reference. */
export const _clearApis = (): void => {
  _apis = null
}
```

---

## 2. `index.ts` — CyApp definition with lifecycle hooks

`mount()` is called by the host after the app is registered. This is the only
place registrations should happen. `unmount()` is called when the user disables
the app; `unregisterAll()` cleans up every surface registered by this app.

```typescript
// src/index.ts
import type { CyApp, CyAppWithLifecycle, AppContext } from 'cyweb/ApiTypes'
import { _setApis, _clearApis } from './appState'
import MyPanel from './panels/MyPanel'
import MyMenuItem from './menuItems/MyMenuItem'

const app: CyApp & CyAppWithLifecycle = {
  id: 'my-plugin',
  name: 'My Plugin',
  description: 'Panel, menu item, and context menu example',

  async mount(context: AppContext): Promise<void> {
    const { apis } = context
    _setApis(apis)

    // ── Panel ────────────────────────────────────────────────────────────────
    const panelResult = apis.uiSurface.registerPanel({
      id: 'main-panel',      // stable, hardcoded — used to identify this surface
      label: 'My Plugin',
      component: MyPanel,
      order: 100,
    })
    if (!panelResult.success) {
      throw new Error(`registerPanel failed: ${panelResult.error.message}`)
    }

    // ── Apps-menu item ───────────────────────────────────────────────────────
    const menuResult = apis.uiSurface.registerMenuItem({
      id: 'main-menu',
      label: 'My Plugin',
      component: MyMenuItem,
      order: 100,
    })
    if (!menuResult.success) {
      throw new Error(`registerMenuItem failed: ${menuResult.error.message}`)
    }

    // ── Context menu item (canvas) ───────────────────────────────────────────
    const ctxResult = apis.contextMenu.addContextMenuItem({
      label: 'My Plugin: Canvas Action',
      targetTypes: ['canvas'],
      handler: (ctx) => {
        console.info('canvas right-clicked at', ctx.type)
      },
    })
    if (!ctxResult.success) {
      throw new Error(`addContextMenuItem failed: ${ctxResult.error.message}`)
    }
    // No need to store ctxResult.data.itemId — unmount() calls unregisterAll()
  },

  async unmount(): Promise<void> {
    const apis = _clearApis_and_return()   // helper below
    if (apis === null) return

    // Removes all surfaces (panel + menu item) registered by this appId.
    apis.uiSurface.unregisterAll()
    // Context menu items registered via AppContext.apis are also cleaned up
    // automatically by appLifecycle.ts, but calling it explicitly is fine.
  },
}

// Small helper to clear and return in one step.
function _clearApis_and_return() {
  try { return require('./appState').getApis() as ReturnType<typeof import('./appState').getApis> }
  catch { return null }
  finally { _clearApis() }
}

export default app
```

> **Note on cleanup:** The host calls `removeAllByAppId` on both
> `UiSurfaceStore` and `ContextMenuItemStore` if `mount()` throws, and again
> when `unmount()` is called. An explicit `unregisterAll()` in `unmount()` is
> therefore redundant but harmless, and makes the intent clear in app code.

---

## 3. `panels/MyPanel.tsx` — right-panel component

Panel components receive `PanelHostProps` from the host renderer. In the first
rollout `PanelHostProps = {}` — no props are injected. Components may call
`getApis()` freely inside event handlers.

```tsx
// src/panels/MyPanel.tsx
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { getApis } from '../appState'

const MyPanel = (): JSX.Element => {
  const [nodeCount, setNodeCount] = useState<number | null>(null)

  const handleCountNodes = (): void => {
    const result = getApis().element.getNodes()
    if (result.success) {
      setNodeCount(result.data.length)
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">My Plugin Panel</Typography>
      <Button variant="contained" size="small" onClick={handleCountNodes}>
        Count Nodes
      </Button>
      {nodeCount !== null && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          Nodes: {nodeCount}
        </Typography>
      )}
    </Box>
  )
}

export default MyPanel
```

---

## 4. `menuItems/MyMenuItem.tsx` — apps-menu component

Apps-menu item components receive `MenuItemHostProps` (also `{}` in the first
rollout). They are rendered inside the Apps drawer, so a compact layout is
appropriate.

```tsx
// src/menuItems/MyMenuItem.tsx
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

const MyMenuItem = (): JSX.Element => {
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="overline" color="text.secondary">
        My Plugin
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Open the My Plugin panel from the right-panel tab.
      </Typography>
      <Button variant="outlined" size="small" disabled>
        Settings (coming soon)
      </Button>
    </Box>
  )
}

export default MyMenuItem
```

---

## 5. Adding a node/edge context menu item (Case A variant)

To also register node and edge items, add them in `mount()` alongside the canvas
item. Each call is independent; all three can be registered in one `mount()`:

```typescript
// inside mount():
for (const [label, targetTypes] of [
  ['My Plugin: Inspect Node',  ['node']],
  ['My Plugin: Inspect Edge',  ['edge']],
  ['My Plugin: Canvas Action', ['canvas']],
] as const) {
  const r = apis.contextMenu.addContextMenuItem({
    label,
    targetTypes,
    handler: (ctx) => {
      console.info(`[my-plugin] ${label}`, ctx.type, ctx.id ?? '')
    },
  })
  if (!r.success) {
    throw new Error(`addContextMenuItem(${label}): ${r.error.message}`)
  }
}
```

---

## 6. Interactive context menu toggle (Case B)

When a user interaction inside the panel should add or remove a context menu
item on demand, use a `Map<string, string>` in `appState.ts` to track item IDs.
The context menu API object is obtained from `getApis()`.

```typescript
// src/appState.ts  (additions)
const _registeredItems = new Map<string, string>()   // key → itemId

export const getRegisteredItemId = (key: string): string | null =>
  _registeredItems.get(key) ?? null

export const setRegisteredItemId = (key: string, itemId: string): void => {
  _registeredItems.set(key, itemId)
}

export const removeRegisteredItem = (key: string): void => {
  _registeredItems.delete(key)
}
```

```tsx
// src/panels/MyPanel.tsx  (toggle button added)
import { getApis, getRegisteredItemId, setRegisteredItemId, removeRegisteredItem } from '../appState'

const KEY = 'inspect-node-item'

const MyPanel = (): JSX.Element => {
  const [active, setActive] = useState(false)

  const handleToggle = (): void => {
    if (active) {
      const itemId = getRegisteredItemId(KEY)
      if (itemId !== null) {
        getApis().contextMenu.removeContextMenuItem(itemId)
        removeRegisteredItem(KEY)
      }
      setActive(false)
    } else {
      const r = getApis().contextMenu.addContextMenuItem({
        label: 'My Plugin: Inspect Node',
        targetTypes: ['node'],
        handler: (ctx) => console.info('node clicked', ctx.id),
      })
      if (r.success) {
        setRegisteredItemId(KEY, r.data.itemId)
        setActive(true)
      }
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <Button
        variant={active ? 'contained' : 'outlined'}
        color={active ? 'error' : 'primary'}
        size="small"
        onClick={handleToggle}
      >
        {active ? 'Deactivate Node Menu' : 'Activate Node Menu'}
      </Button>
    </Box>
  )
}
```

---

## Summary

| Surface type    | Registration API                              | Cleanup                         |
|-----------------|-----------------------------------------------|---------------------------------|
| Right panel     | `apis.uiSurface.registerPanel(options)`       | `unregisterAll()` or host auto  |
| Apps-menu item  | `apis.uiSurface.registerMenuItem(options)`    | `unregisterAll()` or host auto  |
| Context menu    | `apis.contextMenu.addContextMenuItem(options)`| `removeContextMenuItem(itemId)` or host auto |

All registrations happen inside `mount()`. Cleanup happens inside `unmount()`
or automatically when the host calls `removeAllByAppId` on app disable/error.
The `appState.ts` module is the standard bridge between lifecycle callbacks and
React component event handlers.
