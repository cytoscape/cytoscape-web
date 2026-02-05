# Cytoscape Web - Project Overview

## Purpose
Web-based network visualization tool for modern browsers, a web version of Cytoscape Desktop.
- Production URL: https://web.cytoscape.org/
- Repository: https://github.com/cytoscape/cytoscape-web

## Tech Stack

### Core
- **React** 18.3.1 - UI framework
- **TypeScript** 5.5.4 - Language
- **Webpack** 5 - Bundler
- **Zustand** - State management

### Visualization
- **Cytoscape.js** 3.33.1 - Graph/network rendering
- **@antv/g6** - Additional graph features
- **D3.js** modules - Data visualization helpers

### UI Components
- **Mantine** 7.6.2 - Primary UI library
- **MUI** 5.14.x - Additional components
- **PrimeReact** - Data tables and more

### Data Layer
- **Dexie** (IndexedDB) - Local database
- **@tanstack/react-query** - Server state
- **NDEx Client** - Network data exchange

### Testing
- **Jest** 29 - Unit tests
- **Playwright** - E2E tests

## Directory Structure
```
src/
├── features/     # Feature-based modules (main code)
│   ├── Workspace/
│   ├── NetworkPanel/
│   ├── TableBrowser/
│   ├── Vizmapper/
│   └── ... (18 feature modules)
├── data/         # Data access layer
├── models/       # TypeScript type definitions
├── utils/        # Shared utilities
├── assets/       # Static assets
└── init/         # Initialization logic
```
