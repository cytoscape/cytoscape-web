# Embed

`/embed/<ndex-uuid>` shows one NDEx network, read-only, for an `<iframe>` on
another site. Contract: `docs/specifications/EMBED_MODE_SPECIFICATION.md`.

The embed is a route of the full app, not a second viewer. It mounts the
editor's `NetworkPanel`, Hierarchy Viewer and `SearchBox`, and leaves out
everything that edits.

## Files

| File                                  | Role                                                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `EmbedRoute.tsx`                      | Route element. Help page without a UUID; otherwise boots, loads, applies the URL selection, and shows a status or the viewer. |
| `EmbedViewer.tsx`                     | Toolbar, `NetworkPanel`, and the Sub Network Viewer for a hierarchy. Replaces `WorkspaceEditor`.                              |
| `EmbedToolbar.tsx`                    | Network name, `SearchBox`, "Open in Cytoscape Web".                                                                           |
| `EmbedMessage.tsx`                    | Loading, not found, key rejected, too large, unreachable, invalid.                                                            |
| `EmbedHelp.tsx`                       | `/embed/`: address, parameters, example, iframe snippet, limits.                                                              |
| `EmbedErrorElement.tsx`               | Route error element. Imported eagerly, so it stays free of stores.                                                            |
| `embedParams.ts`                      | Parses `selectednodes`, `selectededges`, `selectedSubnetworkNodes`, `activeNetworkViewTab`, `accesskey`.                      |
| `applyEmbedSelection.ts`              | Applies the URL selection after the load.                                                                                     |
| `embedLinkOut.ts`, `useLinkOutUrl.ts` | The editor URL for what the embed shows now.                                                                                  |

Outside this folder:

| File                                                 | Role                                                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/boot/steps/runEmbedBoot.ts`                     | Summary, size check, one-network workspace.                                                          |
| `src/data/db/dbScope.ts`, `inMemoryBackend.ts`       | The `embed` scope and its in-memory database.                                                        |
| `src/ReadOnlyContext.ts`                             | Turns off the renderer's right-click menu and node drag, and the floating toolbar's editing buttons. |
| `src/features/Workspace/useLoadNetworkIntoStores.ts` | The network loader the editor and the embed share.                                                   |

## How read-only holds

1. Not mounted: menus and their shortcuts, the table browser, the workspace
   panel, the style editor, apps.
2. `ReadOnlyContext` (`true` under `EmbedRoute`): `CyjsRenderer` skips the
   `cxttap` menu and node drag; `FloatingToolBar` shows Fit only.
3. The database is in memory, so a write that slips through changes nothing
   outside the frame.

A new editing path inside `NetworkPanel` or the Hierarchy Viewer must read
`useReadOnly()`.

## URL selection

A hierarchy selects the first `selectednodes` id that is one of its
subsystems. Two requests then wait in `SubNetworkStore` for the component that
applies them:

- `cellViewFocus`: the Cell View zooms to the subsystem once it is selected,
  built and shown.
- `urlSelection`: the Sub Network Viewer selects `selectedSubnetworkNodes`
  once it shows that subsystem's network.

The editor's `restoreUrlState` uses the same two requests.

## Testing

- Unit: `embedParams.test.ts`, `embedLinkOut.test.ts`,
  `applyEmbedSelection.test.ts`, `runEmbedBoot.test.ts`, `dbScope.test.ts`,
  `inMemoryBackend.test.ts`.
- E2E: `test/playwright/embed.spec.ts` (mocked NDEx, plain network).
