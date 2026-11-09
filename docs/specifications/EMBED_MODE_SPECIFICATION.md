# Embed mode

> Spec for #871. Status: implemented, except the items §5 and §8 leave open.
> Behavior reference: the prototype on branch `feature/871-embed-lightweight-page`
> (`src/embed/`). Citations into that branch carry the prefix `prototype:`.
> All other citations are to `development`.

## 1. Scope

`/embed/<ndex-uuid>` shows one NDEx network, read-only, inside a third-party
`<iframe>`. The first host is UniProt, whose NDEx cross-references open MuSIC
cell maps (HCX) with a subsystem and a protein selected.

```html
<iframe
  src="https://web.cytoscape.org/embed/<uuid>?selectednodes=134&selectedSubnetworkNodes=482"
  width="100%"
  height="600"
></iframe>
```

Embed mode is a route inside the full app. It mounts the full app's own
components: `NetworkPanel`, the Hierarchy Viewer, `SearchBox`. There is no
second renderer and no code extracted into a shared package.

The prototype is a separate page with copied drawing code. This spec keeps its
URL contract and user-visible behavior, and drops its implementation.

Out of scope:

- Performance and load-time work (the prototype's worker, WebGL, edge streaming,
  prefetch).
- A `postMessage` API for host pages.
- Usage counting.
- Login inside the frame.

## 2. URL contract

### Routes

| Path                   | Shows                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/embed/<uuid>`        | The network.                                                                                                                 |
| `/embed` and `/embed/` | The help page: address, parameters, an example, the iframe snippet, the limits. Port of `prototype:src/embed/EmbedHelp.tsx`. |

The route sits under `config.urlBaseName`, as every other route does.

### Query parameters

The names are the full app's deep-link names (`ROUTING_SPECIFICATION.md`), so
a full-app link becomes an embed link by replacing `/<workspace>/networks/`
with `/embed/`.

| Param                     | Meaning                                                                                       | Parse rule                                             |
| ------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `selectednodes`           | Node ids to select. For HCX, the first id that is a hierarchy node is the selected subsystem. | Split on whitespace, empty entries dropped.            |
| `selectededges`           | Edge ids to select. Plain networks only.                                                      | Same.                                                  |
| `selectedSubnetworkNodes` | Node ids to select in the subsystem's interaction network.                                    | Same. Applied once, to the first subsystem that loads. |
| `activeNetworkViewTab`    | HCX centre tab: `0` Tree View, `1` Cell View.                                                 | Digits only, else ignored. Default Cell View.          |
| `accesskey`               | NDEx share key for an unlisted network.                                                       | As in the full app (`accessKeys.ts:17`).               |

Every other parameter is ignored. That includes `?import=`, `?installApp=`,
panel parameters and filter parameters.

Ids are NDEx node ids, not names.

### Link-out

One button, "Open in Cytoscape Web ↗", opens a new tab with
`target="_blank" rel="noopener noreferrer"`.

- URL: `buildShareUrl` (`src/features/FloatingToolBar/shareUrl.ts:43`), so
  `<base>0/networks/<uuid>`.
- It carries the current selection. A plain network: `selectednodes` and
  `selectededges`. A hierarchy: `selectednodes=<subsystemId>`,
  `activeNetworkView=<uuid>_<subsystemId>`, `selectedSubnetworkNodes` and
  `activeNetworkViewTab`.
- It carries `accesskey` when the embed had one.
- Error screens link to the network with only `accesskey`.
- Built by `embedLinkOut.ts` on top of `buildShareUrl`. The editor's share
  button keeps its own builder (`useCopyShareableNetworkUrl.ts`), which drops
  `accesskey` (§5, defect 5).

## 3. Behavior

### States

| State                                          | Title                              | Detail                                                 | Link-out |
| ---------------------------------------------- | ---------------------------------- | ------------------------------------------------------ | -------- |
| Loading                                        | Loading network…                   | —                                                      | no       |
| Not found: 404, or 401/403 with no `accesskey` | Network not found                  | NDEx has no public network with this UUID.             | no       |
| Key rejected: 401/403 with an `accesskey`      | Network not available              | The share link for this network is off or has changed. | no       |
| Too large                                      | `<name>` is too large to show here | It has N nodes and edges.                              | yes      |
| NDEx unreachable                               | Could not reach NDEx               | Check the connection and reload.                       | yes      |
| Invalid CX2                                    | `<name>` could not be read         | The validator's message.                               | yes      |

The size check runs on the NDEx summary, before the CX2 downloads. It uses
`fitsNetworkSizeLimits` (`networkSizeLimit.ts:36`) with the app's configured
thresholds. Deep links in the full app have no size check today; the embed adds
one.

Strings are taken from `prototype:src/embed/EmbedApp.tsx:50-113`. The "Key
rejected" row is new: the prototype read public networks only.

### Plain networks

| Area            | Behavior                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| Frame           | Toolbar on top: network name, search, link-out. The network fills the rest.                                |
| View            | `NetworkPanel` with its `FloatingToolBar` showing Fit only.                                                |
| Pan, zoom       | As in the full app.                                                                                        |
| Selection       | Tap and box select, as in the full app. The URL's `selectednodes` and `selectededges` are applied on load. |
| Node attributes | The Hierarchy Viewer's `PropertyPanel` floats over the view while exactly one node is selected.            |
| Layout          | A network without coordinates runs the default layout, as in the full app (`WorkspaceEditor.tsx:253-299`). |
| Search          | The full app's `SearchBox`: Fuse.js, results selected.                                                     |

The search behavior differs from the prototype. The prototype matched
substrings and dimmed non-matches. Embed mode uses the full app's matching and
selection, so a query gives the same result in both.

### HCX networks

| Area                | Behavior                                                                                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Centre              | `NetworkTabs`: Tree View and Cell View. Cell View is the default tab.                                                                                                                                             |
| Right pane          | The Sub Network Viewer (`MainPanel`): the interaction network, then the property panel and filter widgets.                                                                                                        |
| Subsystem selection | Clicking a subsystem in either tab loads its interaction network, as in the full app.                                                                                                                             |
| Filter widgets      | Shown and usable. They change visibility only.                                                                                                                                                                    |
| URL focus           | `selectednodes=<subsystem>` selects the subsystem and zooms the Cell View to it. The circle fills half the shorter side, the same `0.5` padding as `expandToInitialSelection` (`CirclePackingPanel.tsx:698-753`). |
| Fit                 | Fits the whole hierarchy and clears the focus.                                                                                                                                                                    |

Cell View depth and selection rules are the full app's. The prototype showed
one level deeper below the selected subsystem. Embed mode does not keep that
difference.

Below 600 px of frame width (MUI's `sm` breakpoint), the right pane stacks
under the centre.

### Read-only

A visitor cannot change the network, its style, its layout or its tables.

| Path                                                                                                                                      | Embed mode                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Toolbar menus (Data, Edit, Select, Layout, Analysis, Tools, Apps, Help)                                                                   | Not mounted.                                   |
| Undo/redo, delete, select-all shortcuts (`useUndoRedoShortcuts.ts:170`, `useDeleteSelectionShortcut.ts:70`, `useSelectAllShortcut.ts:79`) | Not mounted: they mount with the menus.        |
| Right-click menu: Create Node, Create Edge, app items (`CyjsRenderer.tsx:706-812`)                                                        | Off.                                           |
| Edge creation by tap (`CyjsRenderer.tsx:614-646`)                                                                                         | Off: the context menu is its only entry point. |
| Node drag (`CyjsRenderer.tsx:816-840`)                                                                                                    | Off: `cy.autoungrabify(true)`.                 |
| Floating toolbar: Apply Layout, Open in Cytoscape, Share (`FloatingToolBar.tsx:49-62`)                                                    | Hidden. Fit stays.                             |
| Layout tools panel (`FloatingLayoutToolsPanel.tsx`)                                                                                       | Not mounted.                                   |
| Left pane: workspace, style editor, filter tab, LLM query                                                                                 | Not mounted.                                   |
| Table browser                                                                                                                             | Not mounted.                                   |
| Apps and service apps                                                                                                                     | Not loaded.                                    |
| Save to NDEx, workspace save                                                                                                              | Not mounted: they live in the menus.           |

## 4. Architecture

### Route

`/embed/:networkId?` is a top-level sibling of `/manual/*` and `/` in
`src/App.tsx:68-127`. It never mounts `AppShell`, so the workspace boot, apps,
cross-tab sync and the toolbar do not run.

It has its own `errorElement`. The shared `Error` page navigates to `/error`
and offers Reset Workspace (`src/features/Error.tsx:59-62`). Inside a frame,
the error shows in place with the link-out. This follows the #886 fix, which
moved `/error` out from under `/`.

### Database scope

Embed mode is a third database scope, beside `app` and `manual`
(`src/data/db/dbScope.ts:17`).

| Item                   | `app`              | `manual`                 | `embed`                     |
| ---------------------- | ------------------ | ------------------------ | --------------------------- |
| `resolveDbScope` match | default            | `manual` segment         | `embed` segment             |
| Database name          | `cyweb-db`         | `cyweb-manual-db`        | `cyweb-embed-db`            |
| IndexedDB backend      | browser            | browser                  | `fake-indexeddb`, in memory |
| Dexie addons           | `dexie-observable` | `dexie-observable`       | none                        |
| UI events channel      | `cyweb-ui-events`  | `cyweb-manual-ui-events` | `cyweb-embed-ui-events`     |

The database stays on, in memory. Turning it off is not practical:

- About 22 files call `*ToDb()` directly, for example `putWorkspaceToDb`
  (`WorkspaceStore.ts`) and `putNetworkSummaryToDb`
  (`useLoadNetworkSummaries.ts:69`).
- Network loads read the database first (`useLoadCyNetwork.ts:39-43`).
- The database open is the only fatal boot phase (`bootPhases.ts:53-55`).

`fake-indexeddb` is in-memory per JavaScript realm. Each iframe is its own
realm, so two embeds on one host page cannot see each other's data, even with
one database name.

The backend goes in through Dexie's constructor options (`indexedDB`,
`IDBKeyRange`; dexie 3.2.7). `loadInMemoryBackend()`
(`src/data/db/inMemoryBackend.ts`) loads `fake-indexeddb` with a dynamic
import, so only the embed downloads it (a 56 kB chunk). In embed scope
`initializeDb` creates the `CyDB` instance once the backend has loaded. Every
other Dexie instance on the name gets the same options through
`getDexieOptions()`: `reopenDb`, `deleteDatabaseBounded` and the version probe
in `startupOpen.ts`.

`dexie-observable` is dropped in embed scope (`addons: []`). It writes a
`localStorage` key per database name and polls every 500 ms. Its only reader is
cross-tab sync, which is off.

`fake-indexeddb` is in `dependencies`.

`clearSandboxDb` needs no change: it refuses every database but the manual's.
`navigateToNetwork` does nothing in embed scope, as in the manual
(`urlManager.ts`).

### Boot

Module-level boot in `bootstrap.tsx` runs for every route today, the manual
included. Embed mode branches on `currentDbScope() === 'embed'`.

| Step                                        | Location                | Embed mode                                                                                                   |
| ------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `publishHostDescriptor`                     | `bootstrap.tsx:36`      | Skip. No apps.                                                                                               |
| `window.CyWebApi`                           | `bootstrap.tsx:42-44`   | Skip. It exposes a write API on the frame's window.                                                          |
| `enableMapSet`                              | `bootstrap.tsx:60`      | Keep.                                                                                                        |
| `initializeDebug`                           | `bootstrap.tsx:61`      | Keep.                                                                                                        |
| `rememberNdexAccessKeyFromUrl`              | `bootstrap.tsx:65`      | Keep. Its path regex must match `/embed/<uuid>` (`accessKeys.ts:19`).                                        |
| `initializeTabManager`                      | `bootstrap.tsx:74`      | Skip. It writes `window.name`.                                                                               |
| Keycloak and `startAuthentication`          | `bootstrap.tsx:80-95`   | Skip. `signedOutResolution()` stands in; the token gate is never closed, so `getToken()` resolves with `''`. |
| Database open                               | `bootstrap.tsx:101`     | Keep, against the in-memory database.                                                                        |
| Google Analytics                            | `bootstrap.tsx:129-135` | Skip.                                                                                                        |
| `FeatureAvailabilityProvider`               | `AppBootstrap.tsx:75`   | Skip. It polls `http://127.0.0.1:1234/v1/version` from the visitor's browser.                                |
| `OnboardingHost`                            | `App.tsx:165-167`       | Not mounted.                                                                                                 |
| `CookieConsentWidget`                       | `App.tsx:169`           | Not mounted. Nothing to consent to with analytics off.                                                       |
| AppShell and WorkspaceEditor chunk prefetch | `App.tsx:42-46`         | Skip AppShell.                                                                                               |

The embed route then runs its own boot, `runEmbedBoot`:

1. Fetch the NDEx summary with `fetchNdexSummaries(id, undefined, undefined,
accessKey)`, with `resolveDeepLink`'s 30 s timeout.
2. Map the response to a §3 state. Stop on anything but success.
3. Check size with `fitsNetworkSizeLimits`.
4. Cache the summary, and seed `WorkspaceStore` with a one-network workspace.

`EmbedRoute` then loads the network with `useLoadNetworkIntoStores`, the
loader `WorkspaceEditor` uses too, and applies the URL selection
(`applyEmbedSelection.ts`, §5 defects 1 and 3).

It skips WORKSPACE, IMPORTS, INTENTS, ROUTE, the event bus and `cywebapi:ready`
from `runAppShellBoot`. ROUTE in particular must not run: it navigates to
`/<ws>/networks/<id>` and strips the query (`runAppShellBoot.ts:92-105`).

### Components

```text
EmbedRoute               route element; runs runEmbedBoot; owns the §3 states
├─ EmbedHelp             no networkId
├─ EmbedMessage          any state but ready
└─ EmbedViewer           ready
   ├─ EmbedToolbar       name, SearchBox, link-out
   ├─ NetworkPanel       centre: NetworkTab or NetworkTabs (HCX)
   ├─ PropertyPanel      plain only: one selected node's attributes
   └─ MainPanel          HCX only: the Sub Network Viewer
```

New code lives in `src/features/Embed/`, with `Embed_docs/` beside it
(`FEATURE_MODULE_CREATION_PATTERN.md`).

`EmbedViewer` replaces `WorkspaceEditor`. That component assumes `AppShell`
published a workspace, and it mounts the left pane, the table browser and the
panel strips.

### Read-only switch

`ReadOnlyContext` (`src/ReadOnlyContext.ts`, default `false`) is provided as
`true` by `EmbedRoute`. Two components read it:

- `CyjsRenderer`: ignores `cxttap`, skips the drag listener, sets
  `autoungrabify(true)`.
- `FloatingToolBar`: renders Fit only. The Sub Network Viewer's toolbar is the
  same component, so it follows.

Everything else in §3's read-only table is closed by not mounting it.

`NetworkSummary.isReadOnly` (`NetworkSummary.ts:8`) is NDEx's per-network
permission. It is a different concept; do not reuse it.

### Search index

`SearchBox` builds its Fuse index inside the component (`SearchBox.tsx:296-348`).
The Cell View's ring highlight reads `search.lastSearch`, which `SearchBox`
writes. Mounting `SearchBox` in `EmbedToolbar` keeps both working.

Moving the index into a hook is only needed if the embed shows no search box.

### Auth and private networks

The embed never signs in. A third-party frame cannot rely on Keycloak's cookies.
Unlisted networks load through `accesskey`.

The key sits in the iframe URL, readable in the host page's source. An
access-key embed is unlisted, not secret.

## 5. Full-app defects on the embed path

Each defect was in the full app when this work started.

| #   | Defect                                                                                                                                                                   | Status                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `selectednodes=<subsystem>` does not zoom the Cell View. It zooms only when `selectedSubnetworkNodes` resolves to names and the Cell View tab is visible at that moment. | Fixed. `SubNetworkStore.cellViewFocus` holds the subsystem; `CirclePackingPanel` zooms once it is selected, built and shown. The embed and `restoreUrlState` both request it. |
| 2   | `activeNetworkView` restore races the network load. `restoreUrlState` sets it after 1000 ms; `onLoaded` resets it to the hierarchy if the load ends later.               | Open in the full app. The embed sets the view after its own load.                                                                                                             |
| 3   | `selectedSubnetworkNodes` is dropped if the subsystem loads in more than about 6 s (1000 ms + 10 × 500 ms polling).                                                      | Fixed. `SubNetworkStore.urlSelection` holds the ids until `SubNetworkPanel` shows that subnetwork. The embed and `restoreUrlState` both use it.                               |
| 4   | The interaction-network fetch sends no access key, and the interconnect query has no parameter for one. A private hierarchy's subsystems fail for anonymous visitors.    | Open. Depends on §8, question 1.                                                                                                                                              |
| 5   | The share button's URL drops `accesskey` (`useCopyShareableNetworkUrl.ts`).                                                                                              | Open in the full app. The embed's link-out carries the key.                                                                                                                   |
| 6   | `useHierarchyViewerManager` forces `right=open` whenever the HCX popup turns on.                                                                                         | No change: the embed shows the Sub Network Viewer anyway.                                                                                                                     |
| 7   | A full-app link to MuSIC v1 with `activeNetworkView=<uuid>_74&selectednodes=74` ends with the root subsystem ("Cell") selected and its whole interaction network shown.  | Open in the full app. Reproduced on `development` before this change, so not caused by it; cause not yet traced. The embed is not affected: it selects after its own load.    |

`filterFor`, `filterBy`, `filterRange` and `filterEnabled` do not take effect
in the full app (`restoreUrlState.ts:80-111`, `FilterPanel.tsx:84-85,148-150`).
Embed mode ignores them. Fixing them is a separate ticket.

## 6. Hosting

The embed route is served by the app's `index.html`, like every other route.

- The production web server must fall back to `index.html` for `/embed` and
  `/embed/*`. No server config lives in this repo. Unverified: whether
  web.cytoscape.org's existing fallback already covers it.
- web.cytoscape.org sends `X-Frame-Options: SAMEORIGIN`. For embed paths only,
  unset it and send `Content-Security-Policy: frame-ancestors *`.
- Every other path keeps `SAMEORIGIN`. The editor stays unframeable, so it
  cannot be clickjacked through an embed.

Apache sketch:

```apache
<LocationMatch "^/embed(/|$)">
  Header always unset X-Frame-Options
  Header always set Content-Security-Policy "frame-ancestors *"
</LocationMatch>
```

## 7. Files

| File                                                                                 | Change                                                                                                   |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `src/data/db/dbScope.ts`                                                             | `embed` scope, `EMBED_ROUTE_SEGMENT`, `isInMemoryScope`.                                                 |
| `src/data/db/inMemoryBackend.ts`                                                     | New: `fake-indexeddb` as Dexie options.                                                                  |
| `src/data/db/index.ts`                                                               | In-memory `CyDB` created in `initializeDb`; `getDexieOptions` for every instance.                        |
| `src/data/db/startupOpen.ts`                                                         | Version probe uses `getDexieOptions`.                                                                    |
| `src/data/external-api/ndex/accessKeys.ts`                                           | Path regex matches `/embed/<uuid>`.                                                                      |
| `src/data/hooks/navigation/urlManager.ts`                                            | `navigateToNetwork` does nothing in embed scope.                                                         |
| `src/boot/bootstrap.tsx`                                                             | Skips the steps in §4 Boot.                                                                              |
| `src/boot/startAuthentication.ts`                                                    | `signedOutResolution()`.                                                                                 |
| `src/boot/AppBootstrap.tsx`                                                          | Skips `FeatureAvailabilityProvider` in embed scope.                                                      |
| `src/App.tsx`                                                                        | Embed route and error element; gates `OnboardingHost`, `CookieConsentWidget`, prefetch.                  |
| `src/boot/steps/runEmbedBoot.ts`                                                     | New.                                                                                                     |
| `src/boot/steps/resolveDeepLink.ts`                                                  | Exports its timeout helper.                                                                              |
| `src/boot/steps/restoreUrlState.ts`                                                  | Requests the Cell View focus and the subnetwork selection (defects 1, 3).                                |
| `src/ReadOnlyContext.ts`                                                             | New.                                                                                                     |
| `src/features/Embed/*`                                                               | New: route, viewer, toolbar, messages, help page, URL parsing, link-out, selection.                      |
| `src/features/Workspace/useLoadNetworkIntoStores.ts`                                 | New: the loader, moved out of `WorkspaceEditor`.                                                         |
| `src/features/NetworkPanel/CyjsRenderer/CyjsRenderer.tsx`                            | Reads `ReadOnlyContext`.                                                                                 |
| `src/features/FloatingToolBar/FloatingToolBar.tsx`                                   | Reads `ReadOnlyContext`.                                                                                 |
| `src/features/HierarchyViewer/store/SubNetworkStore.tsx`                             | `cellViewFocus`, `urlSelection`.                                                                         |
| `src/features/HierarchyViewer/components/CirclePackingLayout/CirclePackingPanel.tsx` | Zooms to `cellViewFocus`.                                                                                |
| `src/features/HierarchyViewer/components/SubNetworkPanel.tsx`                        | Applies `urlSelection`.                                                                                  |
| `package.json`, `package-lock.json`                                                  | `fake-indexeddb` in `dependencies`.                                                                      |
| `test/playwright/embed.spec.ts`                                                      | New.                                                                                                     |
| Docs                                                                                 | `ROUTING_SPECIFICATION.md`, `STARTUP_SPECIFICATION.md`, `boot.md`, `Database.md`, `Embed_docs/Embed.md`. |

## 8. Open questions

1. **Does an access key cover the interaction networks?** Each subsystem's
   network is a separate NDEx network, so it likely has its own key or none.
   Needs a test against NDEx with one private HCX. Until then, embed mode is
   public networks plus unlisted plain networks.
2. **Size cap: full-app thresholds or a lower embed cap?** The prototype capped
   at 20,000 nodes plus edges. This spec uses the full app's thresholds so both
   agree. A lower cap belongs with the performance work.
3. **Theme.** The embed has no theme toggle and follows the visitor's system
   setting, as the full app does by default (`defaultMode="system"`). The
   prototype was light only. Should the host page choose, for example with a
   `theme` parameter?
4. **Frame height.** At 480 px with the toolbar, the Sub Network Viewer's lower
   pane is about 150 px. Default: hide the property/filter pane below 400 px of
   height. Unmeasured.

## 9. Verification

Unit:

- `dbScope.test.ts`: `/embed`, `/embed/`, `/embed/<uuid>` and
  `/cytoscape/embed/<uuid>` resolve to `embed`; `/embeds` does not.
- `inMemoryBackend.test.ts`: the database stays out of the global IndexedDB,
  and two backends share nothing.
- `accessKeys.test.ts`: the key is captured on `/embed/<uuid>?accesskey=k`.
- `runEmbedBoot.test.ts`: each §3 state from mocked summaries and errors; a
  too-large network is never cached.
- `embedParams.test.ts`, `embedLinkOut.test.ts` (a link-out reads back as the
  same parameters), `applyEmbedSelection.test.ts`.
- `SubNetworkPanel.spec.tsx`: a link's subnetwork selection waits for its
  subnetwork. `CirclePackingPanel.spec.tsx`: the focus waits for the
  selection, the build and the view.

E2E (`test/playwright/embed.spec.ts`, Chromium, NDEx mocked, plain network):

- An unlisted network opens with its key; the CX2 request carries it.
- The browser's IndexedDB stays empty; the page contacts only the app and
  NDEx (no `127.0.0.1:1234`, analytics or SSO); no cookie banner.
- No menus; the floating toolbar has Fit only; right-click opens no menu.
- The link-out carries the key and opens a new tab.
- Not found, key rejected, too large (no CX2 request), and the help page.

Checked by hand against dev1, not in e2e: MuSIC v1
(`1366ba85-9acc-11ef-9702-005056ae6f73`) with
`selectednodes=74&selectedSubnetworkNodes=616` opens the Cell View zoomed to
"Zinc finger protein complex", ZNF500 ringed and selected in the Sub Network
Viewer; `activeNetworkViewTab=0` opens Tree View; at 390 px the panes stack
with no horizontal scroll. The same check passes on a production build
(`vite preview`).

## 10. Remaining work

1. An HCX e2e spec with a mocked hierarchy and interconnect query.
2. Access keys for interaction networks: §8 question 1, then defect 4.
3. Hosting headers and the `/embed` fallback on web.cytoscape.org (§6).
4. Full-app defects 2, 5 and 7.
