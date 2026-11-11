# AppManager Feature

## Overview

The AppManager feature provides a system for managing external applications and services that can be integrated into Cytoscape Web. It allows users to register, configure, activate/deactivate external apps, and manage service endpoints. The feature supports dynamic loading of external components and provides a unified interface for app management.

## Architecture

The AppManager feature consists of:
- **AppListPanel**: Displays and manages registered apps
- **AppSettingsDialog**: Main dialog for app and service management
- **ServiceListPanel**: Manages service endpoints
- **TaskStatusDialog**: Shows progress for service app tasks
- **DataStore**: Provides access to workspace and network stores for external apps
- **loader/remoteModuleLoader**: Loads a remote app's exposed module through the Module Federation runtime
- **useDynamicImport**: Hook for dynamic component loading

## Component Structure

### AppSettingsDialog.tsx
- Main dialog for app management
- Contains AppListPanel and ServiceListPanel
- One Install from URL field above both tabs (#827). It fetches the URL and
  `classifyInstallPayload` decides the kind: a React app manifest goes through
  the origin and host-version gates to `installApp` (inactive); service
  metadata goes to `addService`, and the dialog switches to Service Apps
- Provides close button
- Modal dialog interface

### AppListPanel.tsx
- Displays list of registered apps
- Shows app name, description, and version (if provided)
- Switch to activate/deactivate apps; a failed app shows its reason, keeps its
  switch so it can be turned off, and, when retrying can help, also a Retry
  button. An app this host cannot run (`incompatible-host`) has no switch
- Handles app status changes
- Shows message when no apps are registered

### ServiceListPanel.tsx
- Lists registered service endpoints, with Refresh all
- Displays ServiceList or ExampleServicePanel
- Has no URL field: services are added through the dialog's Install from URL

### ServiceList.tsx
- Displays list of registered services
- Shows service name, description, and endpoint URL
- Provides delete button for each service
- Links to service endpoints

### TaskStatusDialog.tsx
- Displays progress of service app tasks
- Shows task status (pending, running, completed, error)
- Progress bar for running tasks
- Circular progress indicator
- Cancel button to close dialog

### loader/remoteModuleLoader.ts
- `loadModule(scope, module, url)`: registers the remote with the Module Federation runtime and loads one exposed module
- Used by `loadRemoteApp.ts`, in the same folder, to load an app's `./AppConfig`, the only module the host loads from an app
- Renders nothing: panels and dialogs come from the app's registered resources

### DataStore Provider
- **DataStoreContext**: React context for data store
- **DataStoreProvider**: Provides workspace and network stores to external apps
- **useDataStore**: Hook to access data store in external components

### useDynamicImport.tsx
- Hook for dynamically importing external components
- Handles loading states
- Error handling for failed imports
- Returns component and loading status

## Behavior

### App Management
1. The catalog is the deployment's `apps.json`, fetched from `<base>apps.json`
   (or a Manifest Source the user set), plus the apps installed in the
   workspace
2. Apps the deployment's `apps.json` lists are **core apps**: they are on when
   Cytoscape Web starts, unless the workspace records that the user turned
   them off. A workspace with no record of a core app starts it; only turning
   it off writes a record (`inactive`). The rule is `startupAppStatus`
   (`src/models/AppModel/impl/startupAppStatus.ts`), applied by `useAppManager`
3. Every other app starts with the status its workspace record holds, and is
   off when there is none
4. Apps are activated or deactivated with the switch; the status is written to
   `workspace.installedApps`
5. App status is tracked (Active, Inactive, Error). A load that fails is
   reported in a toast (one per startup pass) and on the app's row
6. Versions: when the catalog and an install carry the same app, the newer
   *loadable* semantic version wins (`compareAppVersions`, after
   `canLoadHere` in `useAppManager`: `compatibleHostVersions` and the origin
   check activation applies, which exempts the default `apps.json`). An app
   this host cannot run is never loaded, at startup or by its switch.
   `installApp` updates an older installed version in place, keeps a newer or
   equal one (only turning it on for an install link, or swapping it in when
   an older module still runs after a Refresh), and returns what it did
   (`AppInstallOutcome`). `AppInstallConfirmationDialog` says what confirming
   will do to an installed app (`appInstallPreview` of `installPreview`, the
   `AppManagerCommands` member that makes `installApp`'s decision without
   installing), and the toast and Install from URL name the version kept or
   installed (`appInstallMessage`). A running app's row names the version it
   was loaded from (`AppStore.loadedEntries`), which a Refresh can make differ
   from the catalog's. Activations of one app run one at a time, after its
   startup load
7. Design: `docs/design/module-federation/specifications/workspace-app-install-design.md`
   §7.5 (version upgrades), §8.5 (core apps) and
   `runtime-app-registration-specification.md` §8–§10

### Service Management
1. Services are added via URL input
2. URLs are validated and normalized (trailing slash removed)
3. Duplicate services are prevented
4. Services can be removed via delete button
5. Example services can be added from default list

### Dynamic Loading
1. External components are loaded on demand
2. Loading states are managed
3. Errors are handled gracefully
4. Components receive DataStore via context

### Task Management
1. Service app tasks are tracked
2. Task status is displayed in dialog
3. Progress is shown for running tasks
4. Tasks can be cancelled

## Integration Points

- **AppStore**: Manages app and service state
- **WorkspaceStore**: Provided to external apps via DataStore
- **NetworkStore**: Provided to external apps via DataStore
- **AppConfigContext**: Provides default service URLs
- **ToolBar/AppMenu**: Triggers AppSettingsDialog

## Design Decisions

### Dynamic Import Strategy
- External components loaded on demand
- Reduces initial bundle size
- Supports plugin-like architecture
- Flexible integration model

### DataStore Pattern
- Provides controlled access to stores
- External apps can read workspace/network data
- Maintains data isolation
- Context-based injection

### Service-Based Architecture
- Services are URL-based endpoints
- RESTful API integration
- Easy to add/remove services
- Supports multiple service types

### Status Management
- Clear app status tracking
- Visual feedback for app states
- Error state handling
- User-friendly status display

#### Load failure codes

`AppStore` keeps two session-local records keyed by catalog id: `loadStates`
(`AppLoadState`) and `loadErrors` (`AppLoadFailure`). `setLoadFailed(id, failure)`
writes both, so a `'failed'` app always has a reason. `setLoadState` clears the
reason, and `remove` prunes it. `setLoadState` takes
`SettableAppLoadState` (`AppLoadState` minus `'failed'`), so the compiler — not
convention — keeps `setLoadFailed` the only way into `'failed'`.

`AppLoadFailure` carries identifiers, not prose. `appLoadFailureMessage`
(`src/models/AppModel/impl/appLoadFailureMessage.ts`) turns a code into the text
`AppListPanel` renders on the row and `useAppManager` puts in a toast. It sits in
the model layer, not here, because `src/data` may not import from `src/features`
(`src/data/layering.test.ts`).

| Code | Cause | Retry? |
| --- | --- | --- |
| `origin-blocked` | The catalog URL is outside `appInstallAllowedOrigins`. | No — needs a config change |
| `fetch-failed` | The `remoteEntry.js` request or entry evaluation threw. | No — reload the page |
| `no-app-config` | The bundle exports no default from `./AppConfig`. | No — mis-packaged |
| `id-mismatch` | The bundle's `CyApp.id` differs from the catalog id. | No — mis-packaged |
| `mount-failed` | The bundle loaded but the app's `mount()` threw. | Yes |
| `incompatible-host` | The entry's `compatibleHostVersions` excludes this Cytoscape Web; nothing was loaded. Derived for every row from the entry (`incompatibleHostFailure`), whatever the app's status, except while an older compatible version of the app is running (after a Refresh), which keeps its switch. Also recorded at startup (no toast) and on activation; `setCatalog` retires the recorded one on every catalog replacement. | No — the row has no switch either |

Every failed row except `incompatible-host` keeps its switch: on when the app
was meant to run (`Active` or `Error`), off otherwise. A core app is tried at
every start and cannot be uninstalled, so the switch is how a user stops a
broken one. Turning a failed app off writes the `inactive` record and clears
its failure (`deactivateApp` resets the load state to `unloaded`).

`retryApp` is `activateApp` and nothing else, so only `mount-failed` gets a
Retry button. `fetch-failed` cannot be retried in-tab: the federation runtime
memoizes the rejected entry promise in `globalLoading` for the life of the page.

The strict id compare in `loadRemoteApp` stays strict. The catalog id keys the
federation scope, `appRegistry` and `loadStates`, while `mountApp`/`unmountApp`
key `mountedApps` by the bundle's own id. Accepting a mismatched pair would mount
under one id and look for the other on unmount, leaking the app's panels and
menu items.

Startup auto-load collapses every failure in the pass into one toast: a single
failure names its cause, several are counted. `SnackbarMessageList` shows
messages one at a time, so N broken apps must not queue N toasts.

## Future Improvements

- App configuration UI
- Service authentication
- App marketplace/discovery
- Service health monitoring
- Task queue management
- App permissions system
- Service API documentation
- Service caching
- Batch operations for apps/services

