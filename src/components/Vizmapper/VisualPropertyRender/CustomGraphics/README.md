# Custom Graphics Components

This directory contains the refactored custom graphics components for the Vizmapper. The original monolithic `CustomGraphic.tsx` file (1870 lines) has been broken down into smaller, more maintainable components.

## Structure

```
CustomGraphics/
├── CustomGraphic.tsx              # Original monolithic component (legacy)
├── CustomGraphicRefactored.tsx    # New refactored main component
├── Forms/                         # Form components for each wizard step
│   ├── AttributesForm.tsx         # Node attributes and colors selection
│   ├── PaletteForm.tsx            # Color palette selection
│   └── PropertiesForm.tsx         # Chart properties (start angle, hole size)
├── WizardSteps/                   # Wizard step components
│   ├── SelectTypeStep.tsx         # Chart type selection (Pie vs Ring)
│   ├── ChartPreview.tsx           # Reusable chart preview component
│   ├── StepProgress.tsx           # Wizard progress indicator
│   └── StepGuidance.tsx           # Reusable step guidance messages
├── hooks/                         # Custom hooks for state management
│   └── useCustomGraphicState.ts   # Main state management hook
├── utils/                         # Utility functions
│   ├── palettes.ts                # Color palette definitions
│   └── colorUtils.ts              # Color manipulation utilities
├── index.ts                       # Export barrel for clean imports
└── README.md                      # This file
```

## Components

### Main Components

- **`CustomGraphicDialogRefactored`**: The new main dialog component that orchestrates the wizard
- **`CustomGraphicDialog`**: Original component (legacy, kept for backward compatibility)

### Form Components

- **`AttributesForm`**: Handles node attribute selection and color assignment
- **`PaletteForm`**: Manages color palette selection and preview
- **`PropertiesForm`**: Controls chart properties like start angle and hole size

### Wizard Step Components

- **`SelectTypeStep`**: Chart type selection UI
- **`ChartPreview`**: Reusable chart preview with sticky positioning support
- **`StepProgress`**: Wizard progress indicator with step navigation
- **`StepGuidance`**: Reusable guidance messages with different variants

### Custom Hooks

- **`useCustomGraphicState`**: Manages all state logic for the wizard

### Utilities

- **`PALETTES`**: Color palette definitions
- **`generateRandomColor`**: Generates random colors for new attributes
- **`pickEvenly`**: Distributes colors evenly from a palette

## Usage

### Using the Refactored Component

```tsx
import { CustomGraphicDialogRefactored } from './CustomGraphics'
;<CustomGraphicDialogRefactored
  open={open}
  initialValue={initialValue}
  currentNetworkId={networkId}
  onCancel={handleCancel}
  onConfirm={handleConfirm}
/>
```

### Using Individual Components

```tsx
import {
  AttributesForm,
  PaletteForm,
  PropertiesForm,
  ChartPreview,
  StepGuidance
} from './CustomGraphics'

// Use individual form components
<AttributesForm
  dataColumns={dataColumns}
  colors={colors}
  colorScheme={colorScheme}
  currentNetworkId={networkId}
  onUpdate={handleUpdate}
/>

// Use reusable components
<ChartPreview
  kind={chartKind}
  properties={properties}
  sticky={true}
/>

<StepGuidance
  title="Step Title"
  description="Step description"
  variant="info"
/>
```

### Using the Custom Hook

```tsx
import { useCustomGraphicState } from './CustomGraphics'

const {
  currentStep,
  kind,
  currentProps,
  isLastStep,
  goToNextStep,
  handleAttributesUpdate,
  handlePaletteChange,
  handlePropertiesUpdate,
} = useCustomGraphicState({ open, initialValue })
```

## Testing Strategy

The refactored components include comprehensive test coverage:

### Test Structure

```
__tests__/
├── testUtils.tsx                    # Test utilities and mocks
├── jest.config.js                   # Jest configuration
├── jest.setup.js                    # Test environment setup
├── WizardSteps/                     # Wizard step component tests
│   ├── SelectTypeStep.test.tsx
│   └── StepGuidance.test.tsx
├── Forms/                           # Form component tests
│   ├── AttributesForm.test.tsx
│   └── PaletteForm.test.tsx
├── hooks/                           # Custom hook tests
│   └── useCustomGraphicState.test.tsx
├── utils/                           # Utility function tests
│   └── colorUtils.test.ts
└── CustomGraphicRefactored.integration.test.tsx  # Integration tests
```

### Test Coverage

- **Unit Tests**: Individual component functionality
- **Integration Tests**: Component interactions and workflow
- **Hook Tests**: State management logic
- **Utility Tests**: Pure function testing
- **Accessibility Tests**: Form and UI component accessibility

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- SelectTypeStep.test.tsx

# Run tests in watch mode
npm test -- --watch
```
