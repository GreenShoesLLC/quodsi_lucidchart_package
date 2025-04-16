# Distribution Components

## Overview

This directory contains components for handling statistical distributions in the Quodsi simulation modeling application. These components provide a user interface for selecting and configuring different types of probability distributions used in simulation models.

## Component Structure

The distribution components are organized in the following hierarchy:

```
distribution/
├── DistributionTypeSelector.tsx     # Component for selecting distribution type (e.g., Uniform, Normal)
├── DistributionParametersEditor.tsx # Factory component that renders the appropriate parameter editor
├── parameters/                      # Parameter editors for specific distribution types
│   ├── ConstantParameterEditor.tsx  # Editor for Constant distribution
│   ├── NormalParameterEditor.tsx    # Editor for Normal distribution
│   ├── TriangularParameterEditor.tsx # Editor for Triangular distribution
│   └── UniformParameterEditor.tsx   # Editor for Uniform distribution
```

## Key Components

### DistributionTypeSelector

**Purpose**: Allows users to select the type of distribution to use.

**Features**:
- Dropdown with available distribution types
- Can be configured to show only a subset of distribution types
- Calls back to parent component when distribution type changes

**Usage Example**:
```tsx
<DistributionTypeSelector
  distributionType={distributionType}
  onChange={handleDistributionTypeChange}
  allowedTypes={allowedDistributionTypes}
/>
```

### DistributionParametersEditor

**Purpose**: Factory component that displays the appropriate parameter editor based on the selected distribution type.

**Features**:
- Renders specific parameter editor components based on distribution type
- Handles distribution parameter changes and passes them to parent component
- Uses parameter metadata from shared library for field labels and validation

**Usage Example**:
```tsx
<DistributionParametersEditor
  distribution={distribution}
  distributionType={distributionType}
  onChange={handleDistributionChange}
/>
```

## Parameter Editors

Each distribution type has its own parameter editor component:

### ConstantParameterEditor

**Purpose**: Edits a single constant value.

**Parameters**:
- `value`: The constant value to use

**Validation Rules**:
- Value must be numeric
- Value must be >= 0

### UniformParameterEditor

**Purpose**: Edits parameters for a uniform distribution (equal probability across a range).

**Parameters**:
- `low`: The minimum value (lower bound)
- `high`: The maximum value (upper bound)

**Validation Rules**:
- Both parameters must be numeric
- Both parameters must be >= 0
- `low` must be < `high`

**Smart Behavior**:
- When `low` increases above `high`, automatically adjusts `high` to `low + 1`
- When `high` decreases below `low`, automatically adjusts `low` to `max(0, high - 1)`
- Shows helpful messages when automatic adjustments are made

### NormalParameterEditor

**Purpose**: Edits parameters for a normal (Gaussian) distribution.

**Parameters**:
- `mean`: The average value
- `std`: The standard deviation (spread)

**Validation Rules**:
- Both parameters must be numeric
- `mean` must be >= 0
- `std` must be > 0 

**Smart Behavior**:
- Enforces minimum standard deviation of 0.1
- Shows helpful error messages for invalid inputs

### TriangularParameterEditor

**Purpose**: Edits parameters for a triangular distribution.

**Parameters**:
- `left`: The minimum value
- `mode`: The most likely value (peak)
- `right`: The maximum value

**Validation Rules**:
- All parameters must be numeric
- All parameters must be >= 0
- Must maintain the relationship: `left` <= `mode` <= `right`

**Smart Behavior**:
- When `left` increases above `mode`, adjusts `mode` to `left + 1` and if needed, `right` to `mode + 1`
- When `mode` changes, automatically adjusts `left` or `right` to maintain the required ordering
- When `right` decreases below `mode`, adjusts `mode` to `right - 1` and if needed, `left` to `mode - 1`
- Maintains 1-unit spacing between parameters during auto-adjustments
- Shows helpful messages when automatic adjustments are made

## Integration with Parent Components

Distribution components are typically used within the `EnhancedDurationEditor` component, which combines:
- Distribution type selection
- Distribution parameter editing
- Time unit selection (Seconds, Minutes, Hours, Days)

The complete flow is:
1. User selects a distribution type in `DistributionTypeSelector`
2. Based on the selection, appropriate `DistributionParametersEditor` is rendered
3. User edits parameters specific to that distribution type
4. Parameter changes are validated and passed back to parent components
5. The resulting distribution is used in the simulation model

## Technical Implementation

### Parameter Validation

Parameter validation follows these patterns:
1. Client-side validation in the React components for immediate feedback
2. Validation rules from shared library for consistency
3. Double-checking on the backend before simulation

### Error Handling

The components implement several error handling strategies:
1. Form validation with visual feedback
2. Descriptive error messages
3. Auto-correction of invalid values when possible
4. Explanatory text to help users understand parameter relationships

### Distribution Description

Each parameter editor includes descriptive text explaining:
1. What the distribution represents
2. How the parameters affect the distribution shape
3. When that distribution might be useful

## Adding New Distribution Types

To add a new distribution type:

1. Add the new distribution type to the `DistributionType` enum in the shared library
2. Implement the distribution class in the shared library
3. Create a new parameter editor component in the `parameters/` directory
4. Update `DistributionParametersEditor` to render the new editor when the new type is selected

## Best Practices for Working with Distribution Components

1. **Clear Labeling**: Maintain descriptive labels for distribution parameters
2. **Helpful Explanations**: Include explanatory text for each distribution type
3. **Smart Validation**: Use validation rules that help users maintain valid distributions
4. **Intuitive Auto-Adjustment**: When parameters must be adjusted, do so in intuitive ways
5. **Visual Feedback**: Provide clear visual feedback for validation errors and auto-adjustments
