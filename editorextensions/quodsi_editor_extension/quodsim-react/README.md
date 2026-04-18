# Quodsi React Application

## Overview

Quodsi React is a modern, React 18-based front-end application that provides the user interface for the Quodsi simulation modeling system within LucidChart. It runs as an embedded panel within the LucidChart editor extension and enables users to build, edit, validate, and run discrete event simulations.

## Key Features

- **Model Editing**: Interactive property editors for simulation objects
- **Model Validation**: Validates models against business rules and provides feedback
- **Simulation Management**: Initiates simulation runs and displays results
- **Model Tree Navigation**: Hierarchical view of the simulation model
- **Real-time Updates**: Synchronizes with LucidChart diagrams in real-time

## Architecture

The application is built with a modular architecture organized around features and shared services:

```
quodsim-react/
├── src/
│   ├── features/          # Feature-specific components and logic
│   ├── messaging/         # Communication with host extension
│   ├── hooks/             # Reusable React hooks
│   ├── services/          # Shared services (auth, API, etc.)
│   ├── utils/             # Utility functions and helpers
│   ├── types/             # TypeScript type definitions
│   └── styles/            # Global styles and theme configuration
└── public/                # Static assets
```

### Communication System

The application communicates with the LucidChart extension host using a structured messaging protocol:

- **MessageProvider**: Central context provider for message state
- **Hooks for State Access**: `useAuth()`, `useSelection()`, etc.
- **Message Senders**: Type-safe functions for sending messages
- **Message Handlers**: Process incoming messages from the host

[Read more about the messaging system](./src/messaging/README.md)

### Feature Organization

Each major feature is organized into its own directory with consistent structure:

```
features/
├── auth/              # Authentication components
├── modelEditor/       # Model property editing
├── modelTree/         # Model structure navigation
├── validation/        # Validation results display
└── simulation/        # Simulation execution and results
```

### State Management

The application uses React Context and hooks for state management:

- **MessageContext**: Manages communication state
- **Feature-specific Contexts**: For isolated feature state
- **Custom Hooks**: Encapsulate state logic for components

## Integration Points

### LucidChart Extension Integration

The React application is embedded within the Quodsi LucidChart extension:

1. The extension creates an iframe to host the React application
2. The application initializes and sends a `REACT_APP_READY` message
3. The extension responds with the current model state
4. Bidirectional communication keeps both in sync

### Shared Library Integration

The application uses `@quodsi/shared` for core types and utilities:

- **Model Elements**: Activities, entities, resources, etc.
- **Validation**: Model validation logic
- **Serialization**: Model serialization/deserialization
- **Messaging Protocol**: Message types and validation

## Development

### Prerequisites

- Node.js 16+ and npm
- Access to the Quodsi shared library

### Installation

```bash
# First build the shared library
cd C:\_source\quodsi\quodsi_lucidchart_package\shared
npm install
npm run build

# Then install this project
cd C:\_source\quodsi\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react
npm install
```

### Development Workflow

```bash
# Start development server with hot reloading
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Environment Setup

The application uses environment variables for configuration:

- `.env.development`: Development settings
- `.env.production`: Production settings
- `.env.test`: Test configuration

### Styling

The application uses Tailwind CSS for styling:

- Utility-first CSS approach
- Custom components use Tailwind classes
- Consistent design system across components

## Authentication & Authorization

The application uses Kinde for authentication via Lucid's platform OAuth. The extension calls `getOAuthToken('kinde')`; the React panel receives auth state via `AUTH_STATUS` messages and never handles tokens directly.

- **Sign-in/Sign-out**: Triggered from React via auth messages; Lucid shows the Kinde OAuth popup
- **Token Management**: Lucid platform caches the Kinde token and handles refresh
- **User Identity**: Fetched from the Kinde `user_profile` endpoint by the extension
- **Role-based Access**: Controls feature availability (based on Kinde claims such as `org_code`)

## Component Patterns

### Separation of Concerns

Components follow a separation of concerns pattern:

1. **Presentational Components**: Focus on rendering and UI
2. **Container Components**: Handle data fetching and state
3. **Custom Hooks**: Encapsulate reusable logic
4. **Context Providers**: Manage shared state

### Common Component Structure

```tsx
// Example component structure
import React from 'react';
import { useFeatureState } from './hooks/useFeatureState';
import { FeaturePresentation } from './FeaturePresentation';

export function FeatureContainer() {
  // Logic and state management
  const {
    data,
    loading,
    error,
    handleAction
  } = useFeatureState();

  // Render presentational component with state
  return (
    <FeaturePresentation
      data={data}
      loading={loading}
      error={error}
      onAction={handleAction}
    />
  );
}
```

## Testing

The application uses Jest and React Testing Library for testing:

- **Unit Tests**: For individual components and hooks
- **Integration Tests**: For component interactions
- **Mock Data**: Test fixtures for consistent testing
- **Mock Services**: To isolate components during testing

## Best Practices

### Code Organization

- Group related code by feature
- Keep components focused and single-responsibility
- Use hooks for shared logic
- Maintain clear separation between UI and business logic

### Performance Optimization

- Use React.memo for expensive components
- Implement virtualization for large lists
- Optimize component re-renders
- Use lazy loading for code splitting

### Error Handling

- Implement proper error boundaries
- Provide user-friendly error messages
- Log errors for debugging
- Gracefully degrade functionality

### Accessibility

- Use semantic HTML elements
- Ensure keyboard navigation
- Provide appropriate ARIA attributes
- Test with screen readers

## Contributing

When contributing to the Quodsi React application:

1. Follow the established code organization patterns
2. Add tests for new functionality
3. Update documentation when making changes
4. Follow the TypeScript and React best practices
5. Ensure compatibility with the shared library

## License

[MIT License](./LICENSE)
