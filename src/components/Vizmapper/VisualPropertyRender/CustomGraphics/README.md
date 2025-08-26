# Custom Graphics Components

This directory contains the refactored custom graphics components for the Vizmapper. The original monolithic `CustomGraphic.tsx` file has been broken down into smaller, more maintainable components with enhanced functionality.

## Structure

```
CustomGraphics/
├── CustomGraphicDialog.tsx         # Main dialog component with wizard interface
├── CustomGraphicPicker.tsx         # Inline adapter for VisualPropertyValueForm
├── CustomGraphicRender.tsx         # Main renderer component
├── PieChartRender.tsx              # Pie chart specific renderer
├── RingChartRender.tsx             # Ring chart specific renderer
├── Forms/                          # Form components for each wizard step
│   ├── AttributesForm.tsx          # Node attributes and colors selection
│   ├── PaletteForm.tsx             # Enhanced color palette selection with tabs
│   └── PropertiesForm.tsx          # Chart properties (start angle, hole size)
├── WizardSteps/                    # Wizard step components
│   ├── SelectTypeStep.tsx          # Chart type selection (Pie vs Ring) with validation
│   ├── CustomGraphicPreview.tsx    # Reusable chart preview component
│   ├── StepProgress.tsx            # Wizard progress indicator with navigation
│   └── StepGuidance.tsx            # Reusable step guidance messages
├── hooks/                          # Custom hooks for state management
│   └── useCustomGraphicState.ts    # Main state management hook with validation
├── utils/                          # Utility functions
│   ├── palettes.ts                 # Color palette definitions
│   └── colorUtils.ts               # Color manipulation utilities
├── index.ts                        # Export barrel for clean imports
└── README.md                       # This file
```

## Components

### Main Components

- **`CustomGraphicDialog`**: The main dialog component that orchestrates the multi-step wizard
- **`CustomGraphicPicker`**: Inline adapter component for integration with VisualPropertyValueForm
- **`CustomGraphicRender`**: Main renderer component for displaying custom graphics
- **`PieChartRender`**: Specialized renderer for pie chart graphics
- **`RingChartRender`**: Specialized renderer for ring chart graphics

### Form Components

- **`AttributesForm`**: Handles node attribute selection and color assignment with validation
- **`PaletteForm`**: Enhanced color palette selection with tabbed interface (Sequential, Diverging, Viridis)
- **`PropertiesForm`**: Controls chart properties like start angle and hole size

### Wizard Step Components

- **`SelectTypeStep`**: Chart type selection UI with numeric property validation
- **`CustomGraphicPreview`**: Reusable chart preview with sticky positioning support
- **`StepProgress`**: Wizard progress indicator with step navigation and validation states
- **`StepGuidance`**: Reusable guidance messages with different variants

### Custom Hooks

- **`useCustomGraphicState`**: Manages all state logic for the wizard, including numeric property validation

### Utilities

- **`PALETTES`**: Color palette definitions organized by type
- **`generateRandomColor`**: Generates random colors for new attributes
- **`pickEvenly`**: Distributes colors evenly from a palette

## Key Features

### 1. **Numeric Property Validation**

- Automatically detects if the current network has numeric properties in the node table
- Prevents users from proceeding past the 'select graphics type' step if no numeric data is available
- Shows clear warning messages and disables navigation when appropriate

### 2. **Enhanced Palette Selection**

- **Tabbed Interface**: Organized palette selection with tabs for Sequential, Diverging, and Viridis types
- **Visual Grid**: Compact grid layout with horizontal color bars for easy comparison
- **Consistent Modal Size**: Fixed dimensions prevent layout shifts when switching tabs
- **Quick "No Palette" Option**: Easily accessible button near the title

### 3. **Improved User Experience**

- **Step-by-step Wizard**: Clear progression through chart creation process
- **Visual Feedback**: Hover effects, selection states, and progress indicators
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: Proper ARIA labels and keyboard navigation

### 4. **State Management**

- **Centralized Logic**: All state managed through `useCustomGraphicState` hook
- **Validation Integration**: Built-in validation for numeric properties
- **Persistent State**: Maintains state across dialog opens/closes
- **Type Safety**: Full TypeScript support with proper type definitions

## Usage

### Using the Main Dialog Component

```tsx
import { CustomGraphicDialog } from './CustomGraphics'
;<CustomGraphicDialog
  open={open}
  initialValue={initialValue}
  currentNetworkId={networkId}
  onCancel={handleCancel}
  onConfirm={handleConfirm}
/>
```

### Using the Picker Component

```tsx
import { CustomGraphicPicker } from './CustomGraphics'
;<CustomGraphicPicker
  currentValue={currentValue}
  onValueChange={handleValueChange}
  closePopover={handleClose}
  currentNetworkId={networkId}
/>
```

### Using Individual Form Components

```tsx
import {
  AttributesForm,
  PaletteForm,
  PropertiesForm,
  CustomGraphicPreview,
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

<PaletteForm
  colorScheme={colorScheme}
  colors={colors}
  dataColumns={dataColumns}
  onUpdate={handlePaletteUpdate}
/>

<PropertiesForm
  startAngle={startAngle}
  holeSize={holeSize}
  kind={chartKind}
  onUpdate={handlePropertiesUpdate}
/>

// Use reusable components
<CustomGraphicPreview
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
  hasNumericProperties,
  goToNextStep,
  handleAttributesUpdate,
  handlePaletteChange,
  handlePropertiesUpdate,
} = useCustomGraphicState({ open, initialValue })
```

### Using Renderer Components

```tsx
import {
  CustomGraphicRender,
  PieChartRender,
  RingChartRender
} from './CustomGraphics'

// Main renderer
<CustomGraphicRender
  kind={chartKind}
  properties={properties}
  nodeData={nodeData}
/>

// Specific chart renderers
<PieChartRender properties={pieProperties} nodeData={nodeData} />
<RingChartRender properties={ringProperties} nodeData={nodeData} />
```

## Validation Features

### Numeric Property Detection

The system automatically validates that the current network contains numeric properties:

```tsx
// The hook provides this validation state
const { hasNumericProperties } = useCustomGraphicState({ open, initialValue })

// Components use this to show appropriate UI states
if (!hasNumericProperties) {
  // Show warning message
  // Disable navigation
  // Prevent palette selection
}
```

### Step Navigation Control

- Users cannot proceed past the SelectType step without numeric properties
- Visual feedback shows disabled states
- Clear error messages guide users

## Palette System

### Tabbed Organization

- **Sequential**: Color palettes for continuous data (Sequential1-18)
- **Diverging**: Color palettes for data with a center point (Diverging1-11)
- **Viridis**: Scientific color palettes (Viridis1-4)

### Visual Design

- Horizontal color bars for easy comparison
- Consistent card sizing and alignment
- Hover effects and selection states
- Tooltips showing hex color values

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
└── CustomGraphicDialog.integration.test.tsx  # Integration tests
```

### Test Coverage

- **Unit Tests**: Individual component functionality
- **Integration Tests**: Component interactions and workflow
- **Hook Tests**: State management logic including validation
- **Utility Tests**: Pure function testing
- **Accessibility Tests**: Form and UI component accessibility
- **Validation Tests**: Numeric property detection and step navigation

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

## Recent Improvements

### 1. **Enhanced Validation**

- Added numeric property detection
- Implemented step navigation control
- Added user-friendly warning messages

### 2. **Improved Palette Selection**

- Converted to tabbed interface
- Added horizontal color bar display
- Implemented consistent modal sizing
- Added quick "No Palette" option

### 3. **Better User Experience**

- Fixed modal size consistency
- Improved visual alignment
- Enhanced hover effects and feedback
- Better responsive design

### 4. **Code Quality**

- Improved TypeScript types
- Better component organization
- Enhanced error handling
- More maintainable structure
