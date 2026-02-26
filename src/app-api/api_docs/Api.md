# App API — Behavioral Documentation

## Overview

The app API (`src/app-api/`) is the sole public API for external apps
loaded via Module Federation. It provides a stable contract independent of
internal store and hook implementations.

## Result Convention

All app API operations return `ApiResult<T>`, a discriminated union:

- `{ success: true, data: T }` — operation succeeded
- `{ success: false, error: { code, message } }` — operation failed

App API hooks **never** throw exceptions across the API boundary.

## Error Codes

| Code                      | When Returned                                          |
| ------------------------- | ------------------------------------------------------ |
| `NETWORK_NOT_FOUND`       | The specified network ID does not exist                |
| `NODE_NOT_FOUND`          | The specified node ID does not exist in the network    |
| `EDGE_NOT_FOUND`          | The specified edge ID does not exist in the network    |
| `INVALID_INPUT`           | Input validation failed (missing/malformed parameters) |
| `INVALID_CX2`             | CX2 data failed structural validation                  |
| `OPERATION_FAILED`        | An internal store operation threw an unexpected error  |
| `LAYOUT_ENGINE_NOT_FOUND` | The requested layout engine is not registered          |
| `FUNCTION_NOT_AVAILABLE`  | A renderer function (e.g., fit) is not registered yet  |
| `NO_CURRENT_NETWORK`      | No network is currently selected in the workspace      |

## Module Federation Entry

External apps import types from `cyweb/ApiTypes`:

```typescript
import type { ApiResult, IdType } from 'cyweb/ApiTypes'
import { ApiErrorCode, ok, fail } from 'cyweb/ApiTypes'
```

## App API Hooks (added incrementally)

| Module                 | Hook                  | Phase |
| ---------------------- | --------------------- | ----- |
| `cyweb/ElementApi`     | `useElementApi()`     | 1a    |
| `cyweb/NetworkApi`     | `useNetworkApi()`     | 1b    |
| `cyweb/SelectionApi`   | `useSelectionApi()`   | 1c    |
| `cyweb/ViewportApi`    | `useViewportApi()`    | 1c    |
| `cyweb/TableApi`       | `useTableApi()`       | 1d    |
| `cyweb/VisualStyleApi` | `useVisualStyleApi()` | 1d    |
| `cyweb/LayoutApi`      | `useLayoutApi()`      | 1e    |
| `cyweb/ExportApi`      | `useExportApi()`      | 1e    |
