# Quodsi LucidChart Editor Extension

## Overview

The Quodsi LucidChart Editor Extension is a powerful add-on for LucidChart that transforms standard diagrams into executable discrete event simulation models. The extension provides an interactive UI for configuring, validating, and running simulations directly within the LucidChart environment.

## Architecture

The extension follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────┐
│                         │
│   LucidChart Host       │
│   (Extension Context)   │
│                         │
└───────────┬─────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│                    Extension Core                             │
│                                                               │
│  ┌─────────────┐    ┌────────────┐    ┌───────────────┐      │
│  │ MessageRouter│    │ ModelManager│    │ StorageAdapter│      │
│  └─────────────┘    └────────────┘    └───────────────┘      │
│                                                               │
└───┬───────────────────┬────────────────────┬─────────────────┘
    │                   │                    │
    ▼                   ▼                    ▼
┌─────────────┐    ┌────────────┐      ┌────────────────┐
│             │    │            │      │                │
│ UI Panels   │    │ Data       │      │ Dashboard      │
│             │    │ Sources    │      │ Generation     │
│             │    │            │      │                │
└─────────────┘    └────────────┘      └────────────────┘
        │                 │                    │
        ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  Embedded React Apps                        │
│                  (Auth Panel, Model Panel)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### Core

- **ModelManager**: Central coordinator for model operations
- **StorageAdapter**: Handles data persistence in LucidChart
- **MessageRouter**: Routes messages between host and embedded panels

[→ Core Messaging Documentation](./src/core/messaging/README.md)

### Panels

- **ContentDockPanel**: Auth panel container (replaces deprecated AuthPanel)
- **RightDockPanel**: Model panel container (replaces deprecated ModelPanel)

### Data Sources

Provides access to data stored within LucidChart documents:

- **DataSourceReader**: Base class for data source access
- **SimulationResultsReader**: Specialized reader for simulation results

[→ Data Sources Documentation](./src/data_sources/README.md)

### Dashboard

Generates visualization dashboards for simulation results:

- **SimulationResultsDashboard**: Creates dashboard pages
- **Table Generators**: Creates specialized tables for different data types

[→ Dashboard Documentation](./src/dashboard/README.md)

### Versioning

Manages version compatibility and upgrades:

- **LucidVersionManager**: Coordinates version checking and upgrades
- **LucidVersionUpgrader**: Platform-specific upgrade implementation

[→ Versioning Documentation](./src/versioning/README.md)

## Communication Flow

The extension uses a structured messaging system for communication:

1. **LucidChart Extension Host (TypeScript)**: Runs in the LucidChart environment
2. **Embedded iframes (React)**: Provide the user interface
3. **Message Protocol**: Ensures type-safe communication between components
4. **External APIs**: Communicate with Quodsi backend services

### Message Flow Example

```
┌───────────────┐     ┌──────────────────┐     ┌───────────────┐     ┌───────────────┐
│ React UI      │     │ Message Router   │     │ ModelManager  │     │ Quodsi API    │
│ Component     │     │ & Handlers       │     │               │     │ Service       │
└───────┬───────┘     └────────┬─────────┘     └───────┬───────┘     └───────┬───────┘
        │                      │                       │                     │
        │  Run Simulation      │                       │                     │
        │─────────────────────>│                       │                     │
        │                      │  Validate & Process   │                     │
        │                      │──────────────────────>│                     │
        │                      │                       │  Submit Simulation  │
        │                      │                       │────────────────────>│
        │                      │                       │                     │
        │                      │                       │  Simulation Started │
        │                      │                       │<────────────────────│
        │                      │  Update Status        │                     │
        │                      │<─────────────────────-│                     │
        │  Status Updated      │                       │                     │
        │<─────────────────────│                       │                     │
        │                      │                       │                     │
```

## Embedded React Apps

The extension hosts two React applications:

1. **Auth Panel (ContentDockPanel)**: Handles user authentication and subscription management
2. **Model Panel (RightDockPanel)**: Provides model editing, validation, and simulation capabilities

These apps are built using the quodsim-react project and are embedded as iframes within the LucidChart UI.

## Model Data Structure

The extension stores model data within LucidChart's shape data:

### Metadata (q_meta)

```json
{
  "type": "Activity",
  "version": "1.0.0",
  "lastModified": "2025-02-23T21:35:11.848Z",
  "id": "7sEVil4ffwLR"
}
```

### Data (q_data)

```json
{
  "id": "7sEVil4ffwLR",
  "name": "Process",
  "capacity": 1,
  "inboundQueueCapacity": 1,
  "outboundQueueCapacity": 1,
  "operationSteps": [
    {
      "requirementId": null,
      "quantity": 1,
      "duration": {
        "durationLength": 1,
        "durationPeriodUnit": "MINUTES",
        "durationType": "CONSTANT",
        "distribution": null
      }
    }
  ]
}
```

## Development

### Prerequisites

- Node.js 16+ and npm
- Access to the Quodsi shared library
- LucidChart Extension SDK

### Installation

```bash
# First build the shared library
cd C:\_source\Greenshoes\quodsi_lucidchart_package\shared
npm install
npm run build

# Then install and build this project
cd C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension
npm install
npm run build
```

### Project Structure

```
quodsi_editor_extension/
├── src/
│   ├── core/              # Core components and services
│   │   ├── messaging/     # Communication infrastructure
│   │   ├── ModelManager.ts  # Simulation model management
│   │   └── StorageAdapter.ts # Data persistence
│   │
│   ├── dashboard/         # Dashboard generation
│   │   ├── generators/    # Table generators
│   │   └── SimulationResultsDashboard.ts
│   │
│   ├── data_sources/      # Data access
│   │   └── simulation_results/ # Simulation data handling
│   │
│   ├── panels/            # UI panel containers
│   │   ├── ContentDockPanel.ts # Auth panel container
│   │   └── RightDockPanel.ts   # Model panel container
│   │
│   ├── versioning/        # Version management
│   │   └── LucidVersionManager.ts
│   │
│   ├── managers/          # Feature managers
│   ├── services/          # Shared services
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── extension.ts       # Main entry point
│
└── quodsim-react/         # Embedded React applications
    └── src/
        ├── messaging/     # React-side messaging
        └── features/      # React feature components
```

## Deployment

The extension is deployed through the LucidChart Extension Marketplace. The build process combines the TypeScript extension code and the compiled React applications into a single deployable package.

## Feature Highlights

- **Model Creation**: Convert LucidChart diagrams to simulation models
- **Interactive Editing**: Configure simulation parameters through intuitive forms
- **Validation**: Verify model correctness before simulation
- **Simulation Run**: Execute models using the Quodsim Python engine
- **Results Visualization**: Generate comprehensive dashboards
- **Version Management**: Ensure backward compatibility

## Architecture Evolution

The project is in the process of transitioning from a tightly coupled architecture to a more modular design:

| Old Architecture  | New Architecture            |
| ----------------- | --------------------------- |
| AuthPanel         | ContentDockPanel            |
| ModelPanel        | RightDockPanel              |
| Direct messaging  | MessageRouter system        |
| Monolithic panels | Feature-specific components |

The transition is managed with a feature flag (`useNewMessaging`) in the extension entry point.

## Best Practices

- **Panel Integration**: Implement the `RoutablePanel` interface for new panels
- **Message Handling**: Use the router and type-safe message definitions
- **Data Access**: Use data source readers for consistent access patterns
- **Error Handling**: Provide meaningful error messages and recovery options
- **Version Management**: Always check version compatibility on page load

## Troubleshooting

### Common Issues

1. **Communication Failures**:

   - Check that all panels are properly registered with the MessageRouter
   - Verify that message formats match the shared definitions
   - Check browser console for error messages

2. **Storage Issues**:

   - Verify permissions to store custom data in LucidChart
   - Check for storage format compatibility

3. **Model Validation Issues**:
   - Use validation messages to identify specific issues
   - Check for version compatibility mismatches
   - Verify that all required model components exist

## License

[MIT License](./LICENSE)
