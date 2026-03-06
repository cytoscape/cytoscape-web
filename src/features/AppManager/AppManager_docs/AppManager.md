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
- **ExternalComponent**: Wrapper for dynamically loaded external components
- **useDynamicImport**: Hook for dynamic component loading

## Component Structure

### AppSettingsDialog.tsx
- Main dialog for app management
- Contains AppListPanel and ServiceListPanel
- Provides close button
- Modal dialog interface

### AppListPanel.tsx
- Displays list of registered apps
- Shows app name, description, and version (if provided)
- Checkbox to activate/deactivate apps
- Handles app status changes
- Shows message when no apps are registered

### ServiceListPanel.tsx
- Manages service endpoints
- Text field for adding new service URLs
- Validates and adds services
- Shows warning for duplicate services
- Displays ServiceList or ExampleServicePanel
- Provides "Add Service" button

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

### ExternalComponent.tsx
- Wrapper component for external React components
- Handles dynamic loading
- Provides error boundaries
- Integrates with DataStore

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
1. Apps are registered in the AppStore
2. Apps can be activated or deactivated via checkbox
3. App status is tracked (Active, Inactive, Error)
4. App state changes trigger updates

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

