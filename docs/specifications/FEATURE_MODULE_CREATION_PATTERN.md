# Feature Module Creation Pattern

This specification defines how to create new feature modules in Cytoscape Web.

## Overview

Feature modules live in `src/features/` and are self-contained units of UI functionality. Each feature encapsulates its own components, stores (if needed), models (if needed), utilities, documentation, and tests. There are 23+ feature modules in the codebase.

## Directory Structure

### Simple Feature

```
src/features/Example/
├── Example.tsx                  # Main component
├── index.tsx                    # Public exports
├── Example_docs/
│   └── Example.md               # Behavior documentation
└── components/                  # Sub-components (if needed)
    ├── ExampleButton.tsx
    └── ExamplePanel.tsx
```

### Complex Feature

```
src/features/Example/
├── components/
│   ├── MainPanel.tsx
│   ├── SubComponent/
│   │   ├── SubComponent.tsx
│   │   ├── hooks/
│   │   │   └── useSubComponentLogic.ts
│   │   └── SubComponent_docs/
│   │       └── SubComponent.md
│   └── ...
├── model/                       # Feature-specific models
│   ├── ExampleData.ts
│   └── impl/
│       └── exampleDataImpl.ts
├── store/                       # Feature-specific Zustand stores
│   └── ExampleFeatureStore.ts
├── utils/                       # Feature-specific utilities
│   ├── exampleUtil.ts
│   └── exampleUtil.test.ts
├── tests/                       # Feature-specific tests
│   └── Example.spec.ts
├── Example_docs/
│   └── Example.md
└── index.tsx
```

## Step-by-Step

### 1. Create the Feature Directory

```
src/features/Example/
```

Use PascalCase for the directory name.

### 2. Create the Main Component

```typescript
// src/features/Example/Example.tsx

import { Box, Typography } from '@mui/material'

import { useExampleStore } from '../../data/hooks/stores/ExampleStore'

interface ExampleProps {
  networkId: string
  disabled?: boolean
}

export const Example = ({
  networkId,
  disabled = false,
}: ExampleProps): JSX.Element => {
  // Consume global stores via hooks
  const items = useExampleStore((state) => state.items)

  const handleAction = (): void => {
    // ...
  }

  return (
    <Box data-testid="example-panel">
      <Typography>Example Feature</Typography>
      {/* ... */}
    </Box>
  )
}
```

**Rules:**
- Functional components only — no class components
- Do NOT add `import React from 'react'` (new JSX transform is enabled)
- TypeScript props interface on every component
- Consume stores via hooks with selector functions for performance
- Use MUI components for UI elements

### 3. Add `data-testid` Attributes

All interactive and testable elements must have `data-testid`:

```typescript
// Static IDs for unique elements
<Button data-testid="example-submit-button">Submit</Button>
<TextField data-testid="example-name-input" />

// Dynamic IDs for collections
{items.map((item) => (
  <ListItem
    key={item.id}
    data-testid={`example-item-${item.id}`}
  >
    {item.name}
  </ListItem>
))}

// Container IDs for panels/sections
<Box data-testid="example-panel">
  <Box data-testid="example-header">...</Box>
  <Box data-testid="example-content">...</Box>
</Box>
```

**Naming convention:** `kebab-case` with feature context prefix (e.g., `example-submit-button`, not just `submit-button`).

### 4. Create Public Exports

```typescript
// src/features/Example/index.tsx

export { Example } from './Example'
// Optionally export sub-components that other features need
export { ExampleButton } from './components/ExampleButton'
```

Keep exports minimal — only expose what other features actually consume.

### 5. Create Feature-Specific Store (If Needed)

For state that is local to the feature and not shared globally:

```typescript
// src/features/Example/store/ExampleFeatureStore.ts

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { IdType } from '../../../models/IdType'

interface ExampleFeatureState {
  selectedItemId: IdType
  isExpanded: boolean
}

interface ExampleFeatureActions {
  setSelectedItemId: (id: IdType) => void
  setIsExpanded: (expanded: boolean) => void
}

export const useExampleFeatureStore = create(
  immer<ExampleFeatureState & ExampleFeatureActions>((set) => ({
    selectedItemId: '',
    isExpanded: false,

    setSelectedItemId: (id) => {
      set((state) => {
        state.selectedItemId = id
      })
    },
    setIsExpanded: (expanded) => {
      set((state) => {
        state.isExpanded = expanded
      })
    },
  })),
)
```

**Rules:**
- Feature stores use `Zustand + Immer` (same as global stores)
- Feature stores live in `Feature/store/`, not in `src/data/hooks/stores/`
- Feature stores are not persisted to IndexedDB unless there's a specific need
- Naming: `use<Feature>Store` or `use<SubComponent>Store`

### 6. Create Feature-Specific Models (If Needed)

For domain types specific to this feature:

```typescript
// src/features/Example/model/ExampleData.ts

import { IdType } from '../../../models/IdType'

export interface ExampleData {
  readonly id: IdType
  readonly label: string
  readonly value: number
}
```

Implementation functions go in `model/impl/`:

```typescript
// src/features/Example/model/impl/exampleDataImpl.ts

import { ExampleData } from '../ExampleData'

export const createExampleData = (
  id: string,
  label: string,
  value: number,
): ExampleData => ({ id, label, value })
```

Same rules as global models: pure functions, no framework imports, `readonly` properties.

### 7. Create Utilities (If Needed)

```typescript
// src/features/Example/utils/exampleUtil.ts

import { ExampleData } from '../model/ExampleData'

export const filterByThreshold = (
  items: ExampleData[],
  threshold: number,
): ExampleData[] => items.filter((item) => item.value >= threshold)
```

**Rules:**
- Pure functions without side effects
- Co-locate tests: `exampleUtil.test.ts` in the same directory
- No React or Zustand dependencies

### 8. Create Behavior Documentation

Create `src/features/Example/Example_docs/Example.md`:

```markdown
# Example Feature

## Overview

One paragraph describing what this feature does and where it appears in the UI.

## Architecture

Describe the component composition pattern and key design choices.

## Component Structure

\`\`\`
Example/
├── Example.tsx
├── components/
│   ├── ExampleButton.tsx
│   └── ExamplePanel.tsx
└── index.tsx
\`\`\`

## Components

### Example

The main container component.

**Behavior:**
- Bullet points describing observable behavior
- What happens on user interaction
- Conditional rendering rules

### ExampleButton

**Behavior:**
- What the button does when clicked
- When it is enabled/disabled
- Tooltip text

## Integration Points

List of global stores and services this feature connects to:
- **NetworkStore** — Network data
- **UiStateStore** — Panel visibility
- ...

## Design Decisions

1. **Decision title**: Rationale for the decision
2. **Another decision**: Why this approach was chosen
```

**Rules:**
- Focus on **behavior**, not low-level code details
- Document **design decisions** and their rationale
- List all **integration points** (stores, services)
- Include **component structure** diagram
- Use the same format as existing `_docs/` files (see `FloatingToolBar_docs/FloatingToolBar.md` as reference)

### 9. Custom Hooks (If Needed)

For reusable logic within the feature:

```typescript
// src/features/Example/components/ExamplePanel/hooks/useExamplePanelLogic.ts

import { useCallback, useMemo } from 'react'

import { useNetworkStore } from '../../../../data/hooks/stores/NetworkStore'

export const useExamplePanelLogic = (networkId: string) => {
  const networks = useNetworkStore((state) => state.networks)

  const currentNetwork = useMemo(
    () => networks.get(networkId),
    [networks, networkId],
  )

  const handleRefresh = useCallback(() => {
    // ...
  }, [networkId])

  return { currentNetwork, handleRefresh }
}
```

**Rules:**
- `use*` prefix convention
- Feature-level hooks in `Feature/store/` or `Feature/hooks/`
- Sub-component hooks in `Feature/components/SubComponent/hooks/`
- Extract complex logic from components to improve testability

## Integration with Global Architecture

### Store Access Pattern

Features consume global stores via hooks in React components:

```typescript
// Use selectors for performance — only re-render when selected slice changes
const currentNetworkId = useWorkspaceStore(
  (state) => state.workspace.currentNetworkId,
)
const network = useNetworkStore((state) => state.networks.get(networkId))
```

### Undo/Redo Integration

For undoable operations, use the `useUndoStack` hook:

```typescript
import { useUndoStack } from '../../data/hooks/useUndoStack'

const { postEdit } = useUndoStack()

const handleEdit = () => {
  // Create undo command
  postEdit({
    undo: () => { /* reverse the operation */ },
    redo: () => { /* re-apply the operation */ },
  })
}
```

### Logging

Use structured loggers from `src/debug.ts`:

```typescript
import { logUi } from '../../debug'

logUi.info('[Example]: Panel opened')
logUi.warn('[Example]: No items to display')
logUi.error('[Example]: Failed to load data', error)
```

## Code Style

- No semicolons, single quotes, trailing commas (Prettier)
- Import sorting enforced by `eslint-plugin-simple-import-sort`
- 2-space indentation, 80-char line width
- Functional components only

## Checklist

- [ ] Feature directory created with PascalCase name
- [ ] Main component is a functional component with TypeScript props interface
- [ ] `data-testid` attributes on all interactive elements
- [ ] `index.tsx` exports only the public API
- [ ] `*_docs/*.md` behavior documentation created
- [ ] Feature-specific store uses Zustand + Immer (if needed)
- [ ] Feature-specific models use `readonly` properties (if needed)
- [ ] Utilities are pure functions with co-located tests (if needed)
- [ ] No `import React from 'react'` (new JSX transform)
- [ ] Logging uses structured loggers from `src/debug.ts`
