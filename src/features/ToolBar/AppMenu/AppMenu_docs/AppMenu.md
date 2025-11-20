# AppMenu Feature

## Overview

The `AppMenu` feature provides the **Apps** toolbar menu, acting as the entry point for user-installed external apps and services. It integrates with the `AppManager` and `ServiceApps` systems to:

- Discover active apps and their menu components
- Render app-specific menus dynamically
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
  - **Dynamic Components**:
    - `ExternalComponent`: Loads app-specific menu components at runtime.
  - **Menu Model Factory**:
    - `createMenuItems` (from `MenuFactory.tsx`): Converts `serviceApps` into TieredMenu models.

## Behavior

### Menu Model Construction

1. **Active App Components**
   - Filters `apps` by `AppStatus.Active`.
   - Extracts components of type `ComponentType.Menu` from each app.
   - Builds `componentList` of `[appId, componentId]` pairs.

2. **App Menu Items**
   - For each `(appId, componentId)`, uses `ExternalComponent(appId, './' + componentId)` to create a React component.
   - Wraps each in a `MenuItem` template, passing `handleClose` so apps can close the menu after actions.

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

- **Dynamic Menu via External Components**
  - Apps contribute menu entries by declaring components of type `ComponentType.Menu`.
  - `ExternalComponent` + webpack module federation allows loading components from external bundles at runtime.

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
