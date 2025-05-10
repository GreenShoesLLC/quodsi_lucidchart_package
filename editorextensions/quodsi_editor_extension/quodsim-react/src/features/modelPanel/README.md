# Model Panel Components

## Overview

This directory contains the reimplemented components for the Quodsi Model Panel, leveraging the new messaging system while preserving the user interface and functionality of the original components.

## Component Structure

- **ModelPanel**: The main container component that orchestrates the rendering of child components based on state
- **PanelHeader**: Displays model/element information and provides action buttons
- **ElementEditor**: Renders the appropriate editor based on element type
- **ValidationPanel**: Displays validation messages for the model or selected element
- **SimulationControls**: Provides controls for running simulations and viewing results

## Implementation Details

### Data Flow

1. The `useModelPanel` hook transforms data from the messaging system to the format expected by the UI components
2. The transformed data is passed to the ModelPanel component
3. ModelPanel distributes the data to child components as props
4. User interactions trigger actions that are sent back to the messaging system

### Reused Components

These new components integrate with existing editor components:
- ActivityEditor
- GeneratorEditor
- ResourceEditor
- EntityEditor
- ConnectorEditor
- ModelEditor

### Styling

Components use Tailwind CSS classes for styling, with a design that closely matches the original UI.

## Testing

Unit tests for the `useModelPanel` hook verify correct data transformation and action handling.

## Usage

To use these components, import the ModelPanel from the features/modelPanel directory:

```tsx
import { ModelPanel } from '../features/modelPanel';

// In your component
return (
  <div className="app-container">
    <ModelPanel />
  </div>
);
```

## Feature Toggle

The application includes a feature toggle that allows switching between the old and new implementations for testing and comparison.
