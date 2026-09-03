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
- **MenuBar**: Container for the top-level menus; owns which one is open (`useMenuBarMenu(id)` hands each menu its shared open flag)
- **DropdownMenu**: Reusable non-modal dropdown menu component with submenus
- **NestedMenu**: Support for nested menu structures

## Behavior

### Menu System
- The bar behaves like a desktop menubar: a click opens a menu, and while any menu is open, hovering another trigger (mouse only, not touch) or pressing ArrowLeft/ArrowRight moves the open menu there in one step
- `MenuBar` is the single source of truth for which menu is open; each menu reads its flag through `useMenuBarMenu(id)` and keeps `setOpen(false)` for its own close paths
- Dropdowns are `Popper`s, not `Popover`s: a Popover is a modal whose invisible backdrop ate the click on the next trigger, so every switch used to cost two clicks
- Keyboard: ArrowDown/Enter/Space open a menu with focus on its first row; ArrowUp/Down, Home/End move within a level; ArrowRight opens a submenu or moves to the next menu; ArrowLeft closes a submenu or moves to the previous menu; Escape closes and returns focus to the trigger; Tab or a click elsewhere closes
- Submenus open on hover and support nested structures
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

