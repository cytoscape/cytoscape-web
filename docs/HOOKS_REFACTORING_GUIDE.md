# Table Browser Hooks Refactoring Guide

## Overview

This document outlines the refactoring approach for the TableBrowser component, focusing on extracting selectors and creating better organized, testable hooks. The goal is to improve code maintainability, testability, and reduce the complexity of the main component.

## Problem Statement

The original `TableBrowser.tsx` component had several issues:

1. **Excessive line bloat**: 1780+ lines with multiple store selectors scattered throughout
2. **Poor testability**: Complex component logic mixed with data access
3. **Code duplication**: Repeated patterns for accessing store data
4. **Tight coupling**: Component directly coupled to multiple stores
5. **Difficult maintenance**: Changes required understanding the entire component

## Solution: Custom Hooks Architecture

### 1. Data Access Hooks (`useTableData.ts`)

**Purpose**: Consolidate all table-related data access into reusable hooks

#### `useTableData(networkId)`

Provides comprehensive table data for a specific network:

```typescript
const {
  nodeTable,
  edgeTable,
  selectedNodes,
  selectedEdges,
  tableDisplayConfiguration,
  visualStyle,
  networkModified,
  maxNodeId,
  minNodeId,
  maxEdgeId,
  minEdgeId,
  // Helper functions
  getCurrentTable,
  getSelectedElements,
  getTableConfig,
} = useTableData(networkId)
```

#### `useTableColumns(networkId, isNodeTable)`

Provides column data with configuration:

```typescript
const { columns, modelColumns, currentTable, currentTableConfig } =
  useTableColumns(networkId, true) // true for node table
```

#### `useTableRows(networkId, isNodeTable, sort?)`

Provides row data with filtering and sorting:

```typescript
const { rows, rowsWithIds, selectedElements } = useTableRows(networkId, true, {
  column: 'name',
  direction: 'asc',
  valueType: ValueTypeName.String,
})
```

#### `useColumnVisualDependencies(networkId, columnId?)`

Provides visual property dependencies for a column:

```typescript
const { visualPropertiesDependentOnColumn, hasDependencies } =
  useColumnVisualDependencies(networkId, 'columnName')
```

### 2. Action Hooks (`useTableActions.ts`)

**Purpose**: Consolidate all table-related actions with undo support

```typescript
const {
  // Basic actions
  setCellValue,
  duplicateColumn,
  setColumnName,
  addColumn,
  deleteColumn,
  applyValueToElements,
  moveColumn,
  exclusiveSelect,
  setMapping,
  setTableDisplayConfiguration,
  setNetworkModified,

  // Enhanced actions with undo support
  setCellValueWithUndo,
  duplicateColumnWithUndo,
  renameColumnWithUndo,
  deleteColumnWithUndo,
  addColumnWithUndo,
  moveColumnWithUndo,
  applyValueToColumn,
  selectElements,
  updateTableDisplayConfiguration,
} = useTableActions(networkId)
```

### 3. UI State Hooks (`useTableUI.ts`)

**Purpose**: Manage UI state and user interactions

```typescript
const {
  // State
  currentTabIndex,
  panels,
  tableDisplayConfiguration,
  selection,
  showCreateColumnForm,
  createColumnFormError,
  showDeleteColumnForm,
  deleteColumnFormError,
  showEditColumnForm,
  columnFormError,
  showSearch,
  selectedCellColumn,

  // Actions
  setCurrentTabIndex,
  toggleBottomPanel,
  updateColumnWidth,
  updateTableDisplayConfiguration,
  resetFormErrors,
  closeAllForms,
  handleCellSelection,
  handleHeaderSelection,
  clearSelection,

  // Form state setters
  setShowCreateColumnForm,
  setCreateColumnFormError,
  setShowDeleteColumnForm,
  setDeleteColumnFormError,
  setShowEditColumnForm,
  setColumnFormError,
  setShowSearch,
  setSelectedCellColumn,

  // Selection setters
  setSelection,
  setNodeSelection,
  setEdgeSelection,
} = useTableUI(networkId)
```

## Benefits of This Approach

### 1. **Improved Testability**

- Each hook can be tested independently
- Mock data can be injected easily
- Business logic is separated from UI logic

### 2. **Better Code Organization**

- Related functionality is grouped together
- Clear separation of concerns
- Easier to find and modify specific functionality

### 3. **Reduced Component Complexity**

- Main component focuses on rendering
- Logic is extracted to reusable hooks
- Easier to understand and maintain

### 4. **Enhanced Reusability**

- Hooks can be used in other components
- Consistent patterns across the application
- Reduced code duplication

### 5. **Better Performance**

- Memoized selectors prevent unnecessary re-renders
- Computed values are cached
- Optimized data access patterns

## Testing Strategy

### 1. Hook Testing

Each hook has comprehensive tests covering:

- Happy path scenarios
- Edge cases and error conditions
- State transitions
- Memoization behavior

### 2. Integration Testing

Test how hooks work together:

- Data flow between hooks
- State synchronization
- Error propagation

### 3. Component Testing

Test the refactored component:

- Renders correctly with hook data
- Handles user interactions properly
- Integrates with existing functionality

## Migration Guide

### Step 1: Identify Store Selectors

Look for patterns like:

```typescript
const data = useStore((state) => state.someData)
const action = useStore((state) => state.someAction)
```

### Step 2: Group Related Selectors

Group selectors by functionality:

- Data access selectors
- Action selectors
- UI state selectors

### Step 3: Create Custom Hooks

Extract grouped selectors into custom hooks:

```typescript
export const useMyData = (id: string) => {
  const data = useStore((state) => state.data[id])
  const actions = useStore((state) => state.actions)

  return { data, actions }
}
```

### Step 4: Update Components

Replace direct store access with custom hooks:

```typescript
// Before
const data = useStore((state) => state.data[id])

// After
const { data } = useMyData(id)
```

### Step 5: Add Tests

Create comprehensive tests for each hook:

```typescript
describe('useMyData', () => {
  it('should return data for valid id', () => {
    const { result } = renderHook(() => useMyData('test-id'))
    expect(result.current.data).toBeDefined()
  })
})
```

## Best Practices

### 1. Hook Design

- Keep hooks focused on a single responsibility
- Use meaningful names that describe the hook's purpose
- Provide clear interfaces with TypeScript types
- Include JSDoc documentation

### 2. Performance

- Use `useMemo` for expensive computations
- Use `useCallback` for functions passed to child components
- Avoid unnecessary re-renders with proper dependency arrays

### 3. Testing

- Test hooks in isolation
- Mock external dependencies
- Test both success and error scenarios
- Verify memoization behavior

### 4. Error Handling

- Provide meaningful error messages
- Handle edge cases gracefully
- Use TypeScript for type safety
- Validate inputs where appropriate

## Example Usage

### Before Refactoring

```typescript
export default function TableBrowser({ networkId }) {
  // 50+ lines of store selectors
  const tables = useTableStore((state) => state.tables[networkId])
  const selectedNodes = useViewModelStore((state) => state.selectedNodes)
  const visualStyle = useVisualStyleStore(
    (state) => state.visualStyles[networkId],
  )
  // ... many more selectors

  // Complex component logic mixed with data access
  const nodeIds = Array.from(tables?.nodeTable?.rows?.keys() ?? []).map(
    (v) => +v,
  )
  const maxNodeId = nodeIds.sort((a, b) => b - a)[0]

  // ... 1700+ more lines
}
```

### After Refactoring

```typescript
export default function TableBrowserRefactored({ networkId }) {
  // Clean, organized data access
  const {
    nodeTable,
    selectedNodes,
    visualStyle,
    maxNodeId,
  } = useTableData(networkId)

  const {
    setCellValueWithUndo,
    duplicateColumnWithUndo,
  } = useTableActions(networkId)

  const {
    currentTabIndex,
    selection,
    handleCellSelection,
  } = useTableUI(networkId)

  // Focus on rendering and user interactions
  return (
    <div>
      {/* Component JSX */}
    </div>
  )
}
```

## Next Steps

1. **Complete the refactoring**: Finish implementing all hooks and update the main component
2. **Add comprehensive tests**: Ensure all hooks are thoroughly tested
3. **Document patterns**: Create guidelines for future hook development
4. **Apply to other components**: Use this pattern for other complex components
5. **Performance optimization**: Monitor and optimize hook performance
6. **Code review**: Get feedback and iterate on the design

## Conclusion

This refactoring approach significantly improves the maintainability and testability of the TableBrowser component. By extracting selectors into focused, reusable hooks, we create a more modular and understandable codebase that's easier to maintain and extend.
