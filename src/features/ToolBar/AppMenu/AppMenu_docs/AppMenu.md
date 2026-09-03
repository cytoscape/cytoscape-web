# AppMenu Feature

## Overview

The `AppMenu` feature provides the **Apps** toolbar menu, acting as the entry point for user-installed external apps and services. It integrates with the `AppManager` and `ServiceApps` systems to:

- Discover active apps and their menu entries — runtime `'apps-menu'` resources (plain data the host renders) and legacy manifest menu components
- Render app-specific menu rows dynamically
- Run service tasks and monitor their status
- Open app/settings and task-status dialogs

## Architecture

- **UI Component**
  - `AppMenu.tsx`: Renders the **Apps** button and a nested menu of app and service items using `OverlayPanel` + `TieredMenu`.

- **Integration Points**
  - **`AppStore`**: Provides registered apps, service apps, and current task state.
  - **`useServiceTaskRunner`**: Submits and monitors service tasks.
  - **AppManager Components**:
    - `AppSettingsDialog`: Manage installed apps and services.
    - `TaskStatusDialog`: Show progress of running service app tasks.
  - **`AppResourceStore`**: Runtime `'apps-menu'` resources registered through the App API (`registerMenuItem` / declarative `resources`).
  - **Dynamic Components** (legacy manifest path only):
    - `ExternalComponent`: Loads app-specific menu components at runtime.
  - **Menu Model Factory**:
    - `createMenuItems` (from `MenuFactory.tsx`): Converts `serviceApps` into TieredMenu models.

## Behavior

### Menu Model Construction

1. **Runtime `'apps-menu'` resources** (the App API path)
   - Reads `AppResourceStore` and keeps entries of active apps.
   - Each entry is plain data — `title` (the label), `tooltip`, `icon` (an image URI, as for search-bar providers), `onClick`, `isEnabled`, `requires` — and the HOST renders it as a `DropdownMenuItem` (`data-testid="apps-menu-item-<appId>-<id>"`) with a fixed-size `MenuItemIcon` (`components/UriIcon.tsx`, shared with the search-bar provider icon): an SVG icon is a CSS mask painted in the row's text color, so only its shape comes from the app; a raster icon is an unchanged `<img>`. No app component is ever mounted inside the dropdown, so no app can change the shared menu's size, font, or colors.
   - Enablement: `getResourceVisibility` (`requires.network` / `requires.selection` / app active) plus the app's `isEnabled(apis)` snapshot. Both are re-evaluated every time the menu opens (`open` is a deliberate dependency of `createAppMenu`); a throwing `isEnabled` is logged and counts as disabled.
   - Click: closes the dropdown, then calls `onClick(buildPerAppApis(appId))`. Throws and rejected promises are logged, never surfaced into the menu. Apps that need UI open it from `onClick` via `apis.dialog.open(...)` (rendered by `AppDialogHost`) or `apis.resource.openModal(id)` (rendered by `ModalLauncherHost`) — both outside the menu, in the host-owned `AppDialogShell`.

2. **Legacy manifest menu components** (`CyApp.components` of type `ComponentType.Menu`)
   - Filters `apps` by `AppStatus.Active` and builds `componentList` of `[appId, componentId]` pairs.
   - For each pair, uses `ExternalComponent(appId, './' + componentId)` to create a React component, wrapped in a local `Suspense`, and passes `handleClose` so the app can close the menu after actions.
   - Entries whose id collides with a runtime resource are skipped (runtime wins).

3. **Service Menu Items**
   - Uses `createMenuItems(serviceApps, handleRun)` to build items that run service tasks via `useServiceTaskRunner`.

4. **Base Menu**
   - Always includes a **Manage Apps...** entry that opens the `AppSettingsDialog`.

5. **Final Model**
   - Combines app items, service items, optional divider, and base menu into a single `menuModel`.
   - Model is recomputed when `apps`, `serviceApps`, or `appStateUpdated` change.

### User Interactions

- **Opening the menu**
  - Clicking the **Apps** button triggers `handleClick`, which:
    - Lazily builds the initial menu model on first click.
    - Toggles the `OverlayPanel` containing the `TieredMenu`.

- **Running a Service Task**
  - Selecting a service menu item calls `handleRun(url)`:
    - Closes the menu and opens `TaskStatusDialog`.
    - Uses `run(url)` from `useServiceTaskRunner` to submit and monitor the task.
    - Shows a notification dialog if the service returns a non-complete status or throws.
    - Clears `currentTask` on completion.

- **Managing Apps**
  - Selecting **Manage Apps...** opens `AppSettingsDialog`, where users can enable/disable apps and configure services.

- **Notifications**
  - `ConfirmationDialog` is used to display human-readable error messages when a service task fails.

## Design Decisions

- **Host-rendered menu rows for App API entries**
  - `'apps-menu'` resources are data, not components: the dropdown is shared by every installed app and the host's own items, so the host owns 100% of its rendering. Isolated surfaces (right panel, dialogs) still take full app components.

- **Dynamic Menu via External Components** (legacy)
  - Older apps contribute menu entries by declaring components of type `ComponentType.Menu`.
  - `ExternalComponent` + module federation allows loading components from external bundles at runtime.

- **Separation of Concerns**
  - `AppMenu` focuses on wiring UI to stores and dialogs.
  - `AppManager` owns app registration and configuration.
  - `ServiceApps` owns task execution and result handling.

- **Lazy Initialization**
  - Menu model is built lazily on the first click to avoid unnecessary work at startup.

## Future Improvements

- Better categorization and grouping of apps (by provider, type, or tags).
- Search/filter within the app menu when many apps are installed.
- Per-app permissions and capability flags (e.g., network vs table operations).
- Persisted menu layout or pinning frequently used apps.
