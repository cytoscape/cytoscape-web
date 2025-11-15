# Code Quality Improvement Process

## Overview

We are systematically going through code areas (features, modules, utilities, etc.) and:

1. **Make tests** - Add comprehensive test coverage
2. **Add documentation** - Create `<area>_docs/` folder or docs file depending on scope
3. **Run lint checks** - Ensure code passes ESLint checks, especially React Hooks rules
4. **Clean up low-risk tech debt** - Rename for clarity, move code to appropriate folders if relevant, and other improvements

## Process Guidelines

### Work Order

- **One area at a time** - Complete all four tasks (tests, docs, lint, cleanup) for one code area before moving to the next
- **Order**: Process code areas in the order they appear in the filesystem (or as specified)
- **Review between areas** - Each area is completed and reviewed before starting the next

### Processing Scope

The specific code areas to process will be specified when starting the task. Examples include:

- Feature folders (e.g., `src/features/AppManager/`)
- Utility modules (e.g., `src/utils/`)
- Model folders (e.g., `src/models/NetworkModel/`)
- Hook files (e.g., `src/hooks/`)
- Standalone files or components

## Testing Requirements

### Coverage Target

- **Sensible code coverage** - Focus on:
  - All public APIs and exported functions
  - Key business logic and edge cases
  - Component rendering and user interactions
  - Error handling paths
  - Integration points between modules

### Test Framework

- **Jest** with `ts-jest` and `jsdom` environment
- **React Testing Library** for component tests
- Test files should be co-located with source files (e.g., `Component.test.tsx`) or in a `tests/` subdirectory

### Existing Tests

- **Enhance existing tests** - Review and improve test coverage for features that already have tests
- **Add missing tests** - Create tests for untested functionality
- **Both** - Do both enhancement and addition

### Test Quality

- Tests should be maintainable and clearly describe what they're testing
- Use descriptive test names
- Test both happy paths and error cases
- Mock external dependencies appropriately

### Component Testing Strategy: Extract Hooks for Testability

When testing React components, follow a **two-level testing strategy** that separates business logic from UI rendering:

#### 1. Extract Business Logic to Custom Hooks

**Principle**: Components should be thin UI wrappers. Complex business logic should be extracted into custom hooks.

**Benefits**:

- Hooks can be tested independently with `renderHook` (fast, no React rendering)
- Components become simpler and easier to test
- Logic is reusable across components
- Clear separation of concerns

**Pattern**:

```typescript
// Extract logic to hook
const useMyFeature = () => {
  // Business logic here
  const [state, setState] = useState(...)
  const handleAction = () => { /* logic */ }

  return {
    state,
    handleAction,
    // ... other outputs
  }
}

// Component uses hook outputs
const MyComponent = () => {
  const { state, handleAction } = useMyFeature()
  return <button onClick={handleAction}>{state}</button>
}
```

#### 2. Two-Level Testing Strategy

**Level 1: Test the Hook (Business Logic)**

- Use `renderHook` from `@testing-library/react` to test hooks independently
- Test business logic, state management, edge cases
- Fast execution (no React rendering overhead)
- Focus on "Does the logic work?"

**Example**:

```typescript
import { renderHook, act } from '@testing-library/react'
import { useMyFeature } from './useMyFeature'

describe('useMyFeature', () => {
  it('handles state updates correctly', () => {
    const { result } = renderHook(() => useMyFeature())

    act(() => {
      result.current.handleAction()
    })

    expect(result.current.state).toBe('expected')
  })
})
```

**Level 2: Test the Component (UI Rendering)**

- Mock the hook's return value
- Test that component renders correctly for given hook outputs
- Test user interactions (clicks, typing, etc.)
- Focus on "Does the UI render correctly for given outputs?"

**Example**:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { MyComponent } from './MyComponent'
import { useMyFeature } from './useMyFeature'

jest.mock('./useMyFeature')

describe('MyComponent', () => {
  it('renders button with state value', () => {
    useMyFeature.mockReturnValue({
      state: 'test',
      handleAction: jest.fn(),
    })

    render(<MyComponent />)
    expect(screen.getByText('test')).toBeInTheDocument()
  })

  it('calls handleAction when clicked', () => {
    const mockHandleAction = jest.fn()
    useMyFeature.mockReturnValue({
      state: '',
      handleAction: mockHandleAction,
    })

    render(<MyComponent />)
    fireEvent.click(screen.getByRole('button'))

    expect(mockHandleAction).toHaveBeenCalled()
  })
})
```

#### 3. When to Extract Hooks

Extract logic to hooks when:

- Component has complex business logic (data transformations, calculations)
- Component accesses multiple stores (3+ store hooks)
- Component has complex state management
- Logic could be reused in other components
- Testing the component requires complex mocking setup

#### 4. Dependency Injection Pattern (Optional)

For even better testability, consider dependency injection:

```typescript
// Hook accepts dependencies
const useMyFeature = (params, deps?: Dependencies) => {
  // Use injected deps or default to stores
  const getData = deps?.getData ?? useStore((state) => state.getData)
  // ...
}

// Production: use real dependencies from stores
const deps = useMyFeatureDependencies() // factory that uses stores
const result = useMyFeature(params, deps)

// Tests: inject mocks
const mockDeps = { getData: jest.fn() }
const result = useMyFeature(params, mockDeps)
```

#### 5. Testing Guidelines

**Hook Tests Should Cover**:

- Business logic correctness
- State updates and transitions
- Edge cases and error handling
- Computed/derived values
- Side effects (if any)

**Component Tests Should Cover**:

- Rendering for different hook output states
- User interactions (clicks, typing, etc.)
- Conditional rendering based on hook outputs
- Accessibility (ARIA labels, keyboard navigation)
- Integration with hook functions

**What NOT to Test in Component Tests**:

- Business logic (test that in hook tests)
- Store internals (mock the hook instead)
- Implementation details (test behavior, not implementation)

#### 6. Refactoring Existing Components

When refactoring components for testability:

1. **Identify business logic** - What's complex logic vs simple UI?
2. **Extract pure functions** - Move utility logic to pure functions (no React, no side effects)
3. **Create custom hook** - Move business logic to hook
4. **Define dependency interface** - Make dependencies explicit
5. **Simplify component** - Component should mostly render and delegate
6. **Write hook tests** - Test logic independently
7. **Write component tests** - Test UI with mocked hook

**Example Refactoring**:

```typescript
// Before: Logic mixed with UI
const MyComponent = () => {
  const data1 = useStore1(...)  // Must mock
  const data2 = useStore2(...)  // Must mock
  const data3 = useStore3(...)  // Must mock

  const handleClick = () => {
    // 50+ lines of complex logic
  }

  return <button onClick={handleClick}>Click</button>
}

// After: Logic in hook, component is thin
const useMyFeature = () => {
  const data1 = useStore1(...)
  const data2 = useStore2(...)
  const data3 = useStore3(...)

  const handleClick = () => {
    // 50+ lines of complex logic
  }

  return { handleClick, /* other outputs */ }
}

const MyComponent = () => {
  const { handleClick } = useMyFeature()
  return <button onClick={handleClick}>Click</button>
}
```

#### 7. Resources

For more details on this pattern, see:

- `src/features/FloatingToolBar/FloatingToolBar_docs/TestabilityAnalysis.md`
- `src/features/FloatingToolBar/FloatingToolBar_docs/TestingStrategy.md`
- `src/features/FloatingToolBar/FloatingToolBar_docs/RefactoredExample.tsx`

## Documentation Requirements

### Purpose

Documentation should **capture requirements from current behavior/design** of the code. This means:

- Document the **approach/architecture** (e.g., "stateful approach with handlers that respond to model changes")
- Document **design decisions** and why they exist
- Document **current behavior** and how the code works
- Document **usage patterns** and examples

### Documentation Format

- **Folder structure**: Create `<area>_docs/` folder for code areas with multiple documentation files
- **Single file**: Use a single docs file (e.g., `<area>.md`) for simpler code areas
- **Location**: Place documentation either:
  - Co-located with the code (e.g., `src/features/AppManager/AppManager_docs/`)
  - In a central docs folder (e.g., `docs/features/AppManager/`)
- **Reference example**: See `src/db/snapshot/snapshot_docs/` as a pattern

### Documentation Content

- **Architecture/Design**: How the code area is structured and why
- **API Documentation**: Function signatures, parameters, return values
- **Usage Examples**: How to use the code, common patterns
- **Behavioral Documentation**: What the code does, edge cases, state management (if applicable)
- **Integration Points**: How it connects with other parts of the codebase

### Example Documentation Style

For example, in `CyjsRenderer`, documentation should note:

- The approach is **stateful**
- Every time a user performs actions on the model, there are **handlers to respond to those changes**
- Document the handler pattern and state management approach

## Lint Check Requirements

### Purpose

Ensure code passes ESLint checks, especially React Hooks rules, before completing the code area.

### Lint Command

Run ESLint on the code area files:

```bash
# Lint a specific file
npx eslint src/features/FeatureAvailability/FeatureAvailabilityProvider.tsx

# Or using npm script
npm run lint -- src/features/FeatureAvailability/FeatureAvailabilityProvider.tsx

# Lint entire code area directory
npm run lint -- src/features/FeatureAvailability/
```

### What Gets Checked

- **React Hooks rules** (`react-hooks/rules-of-hooks`): Ensures hooks are called correctly (not conditionally, in correct order)
- **Exhaustive deps** (`react-hooks/exhaustive-deps`): Warns about missing dependencies in `useEffect`, `useMemo`, `useCallback`, etc.
- **React best practices**: JSX usage, component patterns
- **TypeScript**: Type errors, unused variables
- **Import sorting**: Import statement ordering
- **General code quality**: Code style, potential bugs

### Fixing Lint Errors

- **Fix all errors** - All ESLint errors must be resolved
- **Address warnings** - Address warnings, especially React Hooks exhaustive-deps warnings
- **Use auto-fix when safe** - Use `npm run lint:fix` for auto-fixable issues, but review changes

### Integration with Other Tasks

- Run lint checks **after** making code changes (tests, cleanup, refactoring)
- Fix lint errors **before** finalizing documentation
- Ensure lint passes **before** moving to the next code area

## Tech Debt Cleanup

### Scope

- **Naming clarity**: Rename variables, functions, files to be more descriptive
- **Code organization**: Move model-related code to `src/models/` folder if it's a data model or business logic
- **Other improvements**: Any other low-risk improvements you find (code style, structure, etc.)

### Risk Assessment

- **Low-risk changes**: Can be done as part of this process
- **Higher-risk changes**: Must have:
  - New tests associated with them
  - Documentation explaining the change
  - Clear justification for the change

### Code Organization Guidelines

Move code to appropriate folders based on its purpose:

- **Models** (`src/models/`): Data structures, domain models, business logic that's not UI-specific
- **Utils** (`src/utils/`): Pure utility functions, helpers
- **Hooks** (`src/hooks/`): React hooks and hook-related logic
- **Store** (`src/store/`): State management stores (if using centralized stores)
- **Components**: UI components should remain in their feature/module area

General principles:

- Code should be in the folder that best represents its purpose
- Reusable code should be in shared locations
- UI-specific code should stay with its feature/module

### Naming Improvements

- Use descriptive names that clearly indicate purpose
- Follow existing naming conventions in the codebase
- Consider TypeScript naming best practices
- Update all references when renaming

## Project Context

### Technology Stack

- **React 18** with TypeScript
- **Zustand** for state management
- **Jest** + **React Testing Library** for testing
- **IndexedDB** (Dexie) for persistence
- **Cytoscape.js** for network visualization

### Key Directories

- `src/models/` - TypeScript domain models organized by feature
- `src/features/` - Self-contained feature modules
- `src/store/` - Zustand stores for state management
- `src/hooks/` - React hooks
- `src/db/` - Database layer with snapshot functionality (good documentation example)

### Existing Patterns

- Code areas may have their own `model/`, `store/`, `components/`, `utils/`, `tests/` subdirectories
- Some areas already have tests - enhance and add to them
- Documentation example: `src/db/snapshot/snapshot_docs/snapshot.md`

## Deliverables Per Code Area

For each code area, deliver:

1. **Test files** - Comprehensive test coverage
2. **Documentation** - Either `<area>_docs/` folder or `<area>.md` file
3. **Lint verification** - All files pass ESLint checks (especially React Hooks rules)
4. **Code improvements** - Renamed variables/functions, moved code to appropriate folders, other cleanup
5. **Summary** - Brief summary of what was done (tests added, docs created, lint checks passed, improvements made)

## Notes

- Focus on **one code area at a time** for easier review
- Complete all four tasks (tests, docs, lint, cleanup) before moving to the next area
- Higher-risk changes require tests and documentation
- Follow existing patterns and conventions in the codebase
- When in doubt, ask for clarification rather than making assumptions
- Adapt the process to the specific type of code being worked on (components, utilities, models, etc.)
- Always run lint checks after making code changes to catch React Hooks issues early
