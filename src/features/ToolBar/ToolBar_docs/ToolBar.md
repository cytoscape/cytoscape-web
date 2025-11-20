# ToolBar Feature

## Overview

The ToolBar feature provides the main application toolbar with menu items for data operations, editing, layout, analysis, tools, apps, help, and license information. It also includes a search box and login button. The toolbar is always visible at the top of the application.

## Architecture

The ToolBar is organized into menu categories, each with its own submenu system. Menus are implemented using Material-UI components and support nested menu structures.

## Component Structure

### Main Component
- **ToolBar.tsx**: Main toolbar container
  - AppBar with static positioning
  - Logo display
  - Menu items (Data, Edit, Layout, Analysis, Tools, Apps, Help, License)
  - Search box
  - Login button

### Menu Categories
- **DataMenu**: Data import/export operations
- **EditMenu**: Editing operations (undo/redo, etc.)
- **LayoutMenu**: Layout algorithm selection
- **AnalysisMenu**: Analysis tools and LLM queries
- **ToolsMenu**: Utility tools
- **AppMenu**: External app integrations
- **HelpMenu**: Help and documentation
- **LicenseMenu**: License information

### Supporting Components
- **SearchBox**: Search functionality
- **FileUpload**: File upload dialog
- **GenericFileUploadDialog**: Generic file upload UI
- **DatabaseSnapshotFileUpload**: Database snapshot upload
- **DropdownMenu**: Reusable dropdown menu component
- **NestedMenu**: Support for nested menu structures

## Behavior

### Menu System
- Menus open on hover or click (depending on implementation)
- Submenus support nested structures
- Menu items can be enabled/disabled based on context
- Menu items trigger actions or open dialogs

### Search Functionality
- Search box in toolbar
- Searches across networks, nodes, edges
- Real-time search results
- Keyboard shortcuts support

### File Upload
- Supports multiple file formats (CX2, SIF, CSV, TSV)
- Drag-and-drop interface
- File validation
- Progress indicators

## Integration Points

- **All Features**: Menu items trigger feature-specific actions
- **WorkspaceStore**: Accesses workspace state
- **NetworkStore**: Accesses network data for operations
- **UiStateStore**: Manages UI state
- **CredentialStore**: Accesses authentication for NDEx operations

## Design Decisions

### Category-Based Organization
- Logical grouping of related operations
- Familiar pattern for desktop applications
- Easy to navigate

### Static Toolbar
- Always visible for quick access
- Consistent placement
- Doesn't interfere with content

### Menu Item Enablement
- Context-aware enabling/disabling
- Prevents invalid operations
- Clear visual feedback

## Future Improvements

- Customizable toolbar
- Keyboard shortcuts display
- Menu item search
- Recent operations menu
- Toolbar themes
- Compact/expanded modes

