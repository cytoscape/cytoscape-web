# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Building & Development:**
- `npm install` - Install dependencies
- `npm run dev` - Start development server (opens browser at localhost:5500)
- `npm run build` - Build for production
- `npm run build:netlify` - Build for Netlify deployment
- `npm run clean` - Remove dist folder

**Testing:**
- `npm test` - Run all tests (unit + Playwright)
- `npm run test:unit` - Run Jest unit tests only
- `npm run test:playwright` - Run Playwright end-to-end tests with tracing

**Code Quality:**
- `npm run lint` - Lint TypeScript/JavaScript files in src/
- `npm run format` - Format code with Prettier

## Architecture Overview

**Core Architecture:**
Cytoscape Web is a React-based web application for network visualization and analysis. It uses a modular store-based architecture with Zustand for state management and supports external apps through Module Federation.

**Key Directories:**
- `src/models/` - TypeScript domain models organized by feature (NetworkModel, VisualStyleModel, etc.)
- `src/store/` - Zustand stores for state management, following the StoreModel interfaces
- `src/components/` - React components organized by feature (NetworkPanel, ToolBar, Vizmapper, etc.)
- `src/features/` - Self-contained feature modules (HierarchyViewer, MergeNetworks, TableDataLoader, etc.)
- `src/task/` - Async task components for complex operations

**State Management:**
The application uses Zustand stores that implement interfaces from `src/models/StoreModel/`. Major stores include:
- NetworkStore - Manages network data and operations
- VisualStyleStore - Handles visual styling and mappings  
- ViewModelStore - Manages network view state
- WorkspaceStore - Handles workspace and session data
- UiStateStore - UI component states

**Network Rendering:**
Primary renderer is Cytoscape.js (`src/components/NetworkPanel/CyjsRenderer/`). The architecture supports multiple renderers through the RendererStore.

**External Apps:**
Supports Module Federation apps configured in `src/assets/apps.json`. Apps can access exposed stores and task components.

**Data Models:**
- CX2 format support for network import/export (`src/models/CxModel/`)
- Network data structure in `src/models/NetworkModel/`
- Visual style system in `src/models/VisualStyleModel/`

## Testing

**Unit Tests:** Jest with jsdom environment. Test files in `unittest/` directory.
**E2E Tests:** Playwright tests in `test/` directory, configured for Chrome, Firefox, and Safari.
**Test Data:** Demo networks and test configurations in `src/assets/`.

## Build System

Uses Webpack 5 with Module Federation for microfrontend architecture. Key features:
- TypeScript compilation with ts-loader
- Hot module replacement in development
- Code splitting with vendor/app bundles
- CSS extraction and minification
- Automatic Git commit injection into build

## Special Considerations

**Windows Development:** Requires manual environment variable setup for Git commit info (see README.md).
**NDEx Integration:** Connects to NDEx (Network Data Exchange) for network sharing.
**Keycloak Auth:** Authentication system integrated throughout the application.
**IndexedDB:** Client-side persistence using Dexie for offline functionality.