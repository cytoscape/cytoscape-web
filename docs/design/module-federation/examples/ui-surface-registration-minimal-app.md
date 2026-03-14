# UI Surface Registration — Minimal App Examples

- **Rev. 2 (3/14/2026): Keiichiro ONO and Claude Opus 4.6** — Updated to match
  spec Rev. 4: `title` (not `label`), `useAppContext()` as primary pattern,
  declarative `surfaces`, `closeOnAction`, `registerAll`, corrected API calls
- Rev. 1 (3/14/2026): Keiichiro ONO and Claude Sonnet 4.6

Concrete code samples showing the minimum viable plugin app that registers a
panel, an app-menu item, and a context menu item using the runtime registration
API defined in
[ui-surface-registration-specification.md](../specifications/ui-surface-registration-specification.md).

**Three paths to surface registration (choose one per surface):**

| Path | Best for | Boilerplate |
|------|----------|-------------|
| **A. Declarative `surfaces`** (§6.7.1) | Fixed surfaces that never change at runtime | Zero — no `mount()` needed |
| **B. Batch `registerAll` in `mount()`** (§6.2.1) | Multiple surfaces registered together | Low — one call in `mount()` |
| **C. Individual `registerPanel` / `registerMenuItem` in `mount()`** (§6.2.1) | Conditional or capability-guarded registration | Medium — per-call error handling |

**How plugin components access per-app APIs:**

| Pattern | Recommended? | Use case |
|---------|-------------|----------|
| **`useAppContext()`** hook (§6.2.4) | **Yes** | React components — always fresh, HMR-safe, testable |
| `appState.ts` module (§6.6.1) | Deprecated | Non-component code outside the React tree only |

**Related documents:**

- [ui-surface-registration-specification.md](../specifications/ui-surface-registration-specification.md) — Full
  design
- [app-api-use-case-examples.md](./app-api-use-case-examples.md) — Other API use
  cases

---

## File layout

A plugin app that uses all three surface types needs the following files:

```text
src/
├── index.ts                 ← CyApp definition with surfaces / mount() / unmount()
├── panels/
│   └── MyPanel.tsx          ← React component rendered in the right panel
└── menuItems/
    └── MyMenuItem.tsx       ← React component rendered in the Apps menu
```

Context menu items do not need a component — they register a handler function.

---

## 1. Path A — Declarative `surfaces` (recommended for fixed surfaces)

The simplest path. Declare surfaces on the `CyApp` object; the host registers
them automatically. No `mount()` or `unmount()` needed.

```typescript
// src/index.ts
import { lazy } from 'react'
import type { CyAppWithLifecycle } from 'cyweb/ApiTypes'

const app: CyAppWithLifecycle = {
  id: 'my-plugin',
  name: 'My Plugin',
  description: 'Panel and menu item example (declarative)',

  surfaces: [
    {
      slot: 'right-panel',
      id: 'main-panel',                                // stable, hardcoded
      title: 'My Plugin',                              // tab label
      requires: { network: true },                     // hidden when no network loaded
      component: lazy(() => import('./panels/MyPanel')),
    },
    {
      slot: 'apps-menu',
      id: 'main-menu',
      title: 'My Plugin',
      component: lazy(() => import('./menuItems/MyMenuItem')),
      closeOnAction: true,                             // host auto-closes dropdown after action
    },
  ],
  // No mount() or unmount() — host manages everything
}

export default app
```

> **When to add `mount()`:** If the app also needs context menu items or
> conditional logic, implement `mount()` alongside `surfaces`. Declarative
> surfaces are registered first; `mount()` can register additional surfaces or
> upsert over declarative ones.

---

## 2. Path B — Batch `registerAll` in `mount()`

For apps that register multiple surfaces and want a single call instead of
per-surface error handling:

```typescript
// src/index.ts
import type { CyAppWithLifecycle, AppContext } from 'cyweb/ApiTypes'
import MyPanel from './panels/MyPanel'
import MyMenuItem from './menuItems/MyMenuItem'

const app: CyAppWithLifecycle = {
  id: 'my-plugin',
  name: 'My Plugin',
  description: 'Panel, menu item, and context menu example (batch)',

  mount(context: AppContext): void {
    const { apis } = context

    // ── Panels + menu items in one call ──────────────────────────────────
    const result = apis.uiSurface.registerAll([
      {
        slot: 'right-panel',
        id: 'main-panel',
        title: 'My Plugin',
        requires: { network: true },
        component: MyPanel,
      },
      {
        slot: 'apps-menu',
        id: 'main-menu',
        title: 'My Plugin',
        component: MyMenuItem,
        closeOnAction: true,
      },
    ])
    // registerAll always returns ok(); check errors array for partial failures
    if (result.success && result.data.errors.length > 0) {
      console.warn('Some surfaces failed to register:', result.data.errors)
    }

    // ── Context menu item ────────────────────────────────────────────────
    apis.contextMenu.addContextMenuItem({
      label: 'My Plugin: Canvas Action',
      targetTypes: ['canvas'],
      handler: (ctx) => {
        console.info('canvas right-clicked at', ctx.type)
      },
    })
    // No need to store itemId — host auto-cleans on unmount/disable
  },

  // unmount() is optional — host calls cleanupAllForApp on disable/unload.
  // Explicit cleanup is redundant but harmless:
  // unmount(): void {
  //   // Host already called removeAllByAppId for all stores
  // },
}

export default app
```

---

## 3. Path C — Individual registration in `mount()` (maximum control)

For apps that need capability negotiation or per-call error handling:

```typescript
// src/index.ts
import type { CyAppWithLifecycle, AppContext } from 'cyweb/ApiTypes'
import MyPanel from './panels/MyPanel'
import MyMenuItem from './menuItems/MyMenuItem'

const app: CyAppWithLifecycle = {
  id: 'my-plugin',
  name: 'My Plugin',
  description: 'Panel, menu item, and context menu (individual)',

  mount(context: AppContext): void {
    const { apis } = context

    // ── Panel (only if slot is supported) ────────────────────────────────
    if (apis.uiSurface.getSupportedSlots().includes('right-panel')) {
      const panelResult = apis.uiSurface.registerPanel({
        id: 'main-panel',
        title: 'My Plugin',
        requires: { network: true },
        component: MyPanel,
        order: 100,
      })
      if (!panelResult.success) {
        throw new Error(`registerPanel failed: ${panelResult.error.message}`)
      }
    }

    // ── Apps-menu item ───────────────────────────────────────────────────
    if (apis.uiSurface.getSupportedSlots().includes('apps-menu')) {
      const menuResult = apis.uiSurface.registerMenuItem({
        id: 'main-menu',
        title: 'My Plugin',
        component: MyMenuItem,
        closeOnAction: true,
        order: 100,
      })
      if (!menuResult.success) {
        throw new Error(`registerMenuItem failed: ${menuResult.error.message}`)
      }
    }

    // ── Context menu item (canvas) ───────────────────────────────────────
    apis.contextMenu.addContextMenuItem({
      label: 'My Plugin: Canvas Action',
      targetTypes: ['canvas'],
      handler: (ctx) => {
        console.info('canvas right-clicked at', ctx.type)
      },
    })
  },
}

export default app
```

> **Note on cleanup:** The host calls `cleanupAllForApp(appId)` on both
> `UiSurfaceStore` and `ContextMenuItemStore` when an app is disabled, when
> `mount()` throws, and on page unload. Implementing `unmount()` purely for
> cleanup is unnecessary — the host handles it. `unmount()` is only needed if
> the app must perform app-specific teardown (e.g., closing a WebSocket).

---

## 4. `panels/MyPanel.tsx` — right-panel component

Panel components receive `PanelHostProps` from the host renderer. In the first
rollout `PanelHostProps` is empty — no props are injected.

Plugin components use `useAppContext()` from `cyweb/AppIdContext` to access the
per-app `apis` object (§6.2.4). This is the recommended pattern — always fresh,
HMR-safe, and testable.

```tsx
// src/panels/MyPanel.tsx
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useAppContext } from 'cyweb/AppIdContext'

const MyPanel = (): JSX.Element => {
  const ctx = useAppContext()
  const [networkCount, setNetworkCount] = useState<number | null>(null)

  const handleListNetworks = (): void => {
    if (ctx === null) return
    const result = ctx.apis.workspace.getNetworkList()
    if (result.success) {
      setNetworkCount(result.data.length)
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">My Plugin Panel</Typography>
      <Button variant="contained" size="small" onClick={handleListNetworks}>
        Count Networks
      </Button>
      {networkCount !== null && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          Networks in workspace: {networkCount}
        </Typography>
      )}
    </Box>
  )
}

export default MyPanel
```

---

## 5. `menuItems/MyMenuItem.tsx` — apps-menu component

Apps-menu item components receive `MenuItemHostProps` with
`handleClose: () => void`. When the surface is registered with
`closeOnAction: true`, the host auto-closes the dropdown after any click — the
plugin does not need to call `handleClose` manually.

When `closeOnAction: false` (default), the plugin must call `handleClose`
explicitly — typically after a Dialog closes, not before (calling it immediately
would unmount the Dialog).

```tsx
// src/menuItems/MyMenuItem.tsx
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import type { MenuItemHostProps } from 'cyweb/ApiTypes'

/** When closeOnAction: true — handleClose is auto-called by the host. */
const MyMenuItem = ({ handleClose }: MenuItemHostProps): JSX.Element => {
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

## 6. Adding node/edge context menu items (Case A — always-on)

To register multiple context menu items at mount time, add them in `mount()`
alongside the canvas item. All calls are independent; all can be registered in
one `mount()`. The host auto-cleans everything on disable.

```typescript
// inside mount():
for (const [label, targetTypes] of [
  ['My Plugin: Inspect Node', ['node']],
  ['My Plugin: Inspect Edge', ['edge']],
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

## 7. Interactive context menu toggle (Case B — user-toggled)

### Recommended: `useAppContext()` (§6.2.4)

When a user interaction inside the panel should add or remove a context menu
item on demand, use `useAppContext()` to access the per-app API and a `useRef`
to track the item ID:

```tsx
// src/panels/MyPanel.tsx — toggle button using useAppContext (recommended)
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { useRef, useState } from 'react'
import { useAppContext } from 'cyweb/AppIdContext'

const MyPanel = (): JSX.Element => {
  const ctx = useAppContext()
  const itemId = useRef<string | null>(null)
  const [active, setActive] = useState(false)

  const handleToggle = (): void => {
    if (ctx === null) return

    if (active && itemId.current !== null) {
      ctx.apis.contextMenu.removeContextMenuItem(itemId.current)
      itemId.current = null
      setActive(false)
    } else {
      const r = ctx.apis.contextMenu.addContextMenuItem({
        label: 'My Plugin: Inspect Node',
        targetTypes: ['node'],
        handler: (c) => console.info('node clicked', c.id),
      })
      if (r.success) {
        itemId.current = r.data.itemId
        setActive(true)
      }
    }
  }

  // On app disable, host calls cleanupAllForApp — any un-removed item is auto-cleaned.

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

export default MyPanel
```

### Interim: `appState.ts` for non-component code (deprecated)

For code that runs **outside the React tree** (Web Workers, non-component
utility modules) where React Context is unavailable, the `appState.ts`
module-scope pattern remains available as an interim solution. This pattern is
explicitly deprecated — new plugin components **must** use `useAppContext()`.

```typescript
// src/appState.ts — deprecated; use useAppContext() in components instead
import type { AppContextApis } from 'cyweb/ApiTypes'

let _apis: AppContextApis | null = null

/** Returns the bound APIs if the app is mounted, null otherwise. */
export const getApis = (): AppContextApis | null => _apis

/** Called only from mount(). */
export const _setApis = (apis: AppContextApis | null): void => {
  _apis = apis
}
```

```typescript
// src/index.ts — lifecycle callbacks update the central state
import { _setApis } from './appState'

const app: CyAppWithLifecycle = {
  id: 'my-plugin',
  name: 'My Plugin',

  mount({ apis }) {
    _setApis(apis)
    // ... registrations ...
  },
  unmount() {
    _setApis(null)
  },
}
```

> **Constraint — post-mount only:** `getApis()` returns `null` before `mount()`
> completes. Only call it from user-driven event handlers (button clicks, menu
> selections), never during component initialization (e.g., inside a
> `useEffect(fn, [])` at render time).

---

## 8. Upsert: dynamically updating a registered surface

Re-registering a surface with the same `id` replaces it in place (upsert
semantics), preserving tab selection state. This lets apps update title, order,
or component without flicker:

```typescript
// inside mount() or a component event handler:
apis.uiSurface.registerPanel({
  id: 'main-panel',            // same id as before
  title: 'My Plugin (updated)', // new title
  component: UpdatedPanel,      // new component
})
// The surfaceId is unchanged; if this panel was the selected tab, it stays selected.
```

---

## 9. Introspection: debugging registered surfaces

Plugin developers can inspect what surfaces are registered and why a surface is
hidden:

```typescript
// inside mount() or a component event handler:
const surfaces = apis.uiSurface.getRegisteredSurfaces()
console.log('Registered surfaces:', surfaces)

const vis = apis.uiSurface.getSurfaceVisibility('main-panel')
console.log('Panel visibility:', vis)
// { registered: true, visible: false, hiddenReason: 'requires-network' }
```

---

## Summary

| Surface type | Registration API | Cleanup |
|--------------|------------------|---------|
| Right panel | `surfaces: [{ slot: 'right-panel', ... }]` (declarative) | Host auto |
| Right panel | `apis.uiSurface.registerPanel(options)` (imperative) | `unregisterAll()` or host auto |
| Apps-menu item | `surfaces: [{ slot: 'apps-menu', ... }]` (declarative) | Host auto |
| Apps-menu item | `apis.uiSurface.registerMenuItem(options)` (imperative) | `unregisterAll()` or host auto |
| Context menu | `apis.contextMenu.addContextMenuItem(options)` | `removeContextMenuItem(id)` or host auto |

All imperative registrations happen inside `mount()`. Cleanup is automatic when
the host calls `cleanupAllForApp(appId)` on app disable, mount failure, or page
unload — explicit cleanup in `unmount()` is redundant but harmless.

Plugin components access the per-app API via `useAppContext()` from
`cyweb/AppIdContext` (§6.2.4). The deprecated `appState.ts` pattern is reserved
for non-component code only (§6.6.1).
