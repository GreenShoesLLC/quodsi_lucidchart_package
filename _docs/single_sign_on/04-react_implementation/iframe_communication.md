# Iframe Communication for LucidChart Integration

This document provides detailed instructions for implementing secure cross-domain communication between the Quodsi React application running in a LucidChart iframe and the parent LucidChart application.

## Overview

When running within a LucidChart iframe, the Quodsi React application needs to communicate with the parent LucidChart application to exchange information about authentication state, user actions, and application events. This communication must be implemented securely to prevent potential cross-site scripting vulnerabilities.

## Prerequisites

- React application with MSAL.js integration
- LucidChart editor extension configured
- Understanding of the `window.postMessage()` API
- Understanding of iframe security considerations

## Step 1: Create Message Protocol

Define a standardized protocol for messages between the React app and LucidChart:

```javascript
// src/utils/messageTypes.js

/**
 * Message types for communication with LucidChart
 */
export const MESSAGE_TYPES = {
  // Messages sent from Quodsi to LucidChart
  READY: 'READY',                           // App is initialized and ready
  AUTH_STATE_CHANGE: 'AUTH_STATE_CHANGE',   // Authentication state has changed
  SIMULATION_STARTED: 'SIMULATION_STARTED', // Simulation has started
  SIMULATION_COMPLETED: 'SIMULATION_COMPLETED', // Simulation has completed
  SIMULATION_ERROR: 'SIMULATION_ERROR',     // Simulation encountered an error
  REQUEST_DATA: 'REQUEST_DATA',             // Request diagram data from LucidChart
  
  // Messages sent from LucidChart to Quodsi
  INIT: 'INIT',                   // Initialize the application with configuration
  REQUEST_AUTH: 'REQUEST_AUTH',   // Request authentication from the user
  DIAGRAM_DATA: 'DIAGRAM_DATA',   // Provide diagram data to the application
  RUN_SIMULATION: 'RUN_SIMULATION', // Request to run a simulation
  RESIZE_PANEL: 'RESIZE_PANEL',   // Resize the panel
  THEME_CHANGE: 'THEME_CHANGE'    // LucidChart theme has changed
};

/**
 * Standard message format
 */
export const createMessage = (type, payload = {}) => ({
  source: 'quodsi',  // Identifies the source of the message
  type,              // Message type from MESSAGE_TYPES
  payload            // Message data
});
```

## Step 2: Create Frame Communication Service

Implement a service to handle communication with the parent frame:

```javascript
// src/services/frameService.js
import { MESSAGE_TYPES, createMessage } from '../utils/messageTypes';

/**
 * Allowed origins for secure communication
 */
const ALLOWED_ORIGINS = [
  'https://lucid.app',
  'https://chart.lucid.app', 
  'https://app.lucid.co',
  // Add development origins if needed
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
].filter(Boolean);

class FrameService {
  constructor() {
    this.messageHandlers = new Map();
    this.isLucidChartFrame = window.parent !== window;
    this.isInitialized = false;
    
    // Bind methods
    this.handleMessage = this.handleMessage.bind(this);
  }
  
  /**
   * Initialize the frame service
   */
  initialize() {
    if (this.isInitialized) return;
    
    // Add event listener for incoming messages
    window.addEventListener('message', this.handleMessage);
    
    // Send ready message to parent if in iframe
    if (this.isLucidChartFrame) {
      this.sendMessage(MESSAGE_TYPES.READY);
    }
    
    this.isInitialized = true;
  }
  
  /**
   * Clean up event listeners
   */
  destroy() {
    window.removeEventListener('message', this.handleMessage);
    this.isInitialized = false;
  }
  
  /**
   * Send message to parent frame
   */
  sendMessage(type, payload) {
    if (!this.isLucidChartFrame) {
      console.warn('Not in LucidChart iframe, message not sent');
      return;
    }
    
    const message = createMessage(type, payload);
    
    // Send to Lucid app
    window.parent.postMessage(message, 'https://lucid.app');
  }
  
  /**
   * Register a message handler
   */
  on(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    
    this.messageHandlers.get(messageType).push(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType) || [];
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  }
  
  /**
   * Process incoming messages
   */
  handleMessage(event) {
    // Validate message origin
    if (!ALLOWED_ORIGINS.includes(event.origin)) {
      console.warn(`Message from non-allowed origin: ${event.origin}`);
      return;
    }
    
    const message = event.data;
    
    // Validate message format
    if (!message || typeof message !== 'object' || message.source !== 'lucidchart') {
      return;
    }
    
    // Process the message
    const { type, payload } = message;
    const handlers = this.messageHandlers.get(type) || [];
    
    // Call all registered handlers for this message type
    handlers.forEach(handler => {
      try {
        handler(payload, event);
      } catch (error) {
        console.error(`Error in message handler for ${type}:`, error);
      }
    });
  }
  
  /**
   * Request diagram data from LucidChart
   */
  requestDiagramData() {
    return new Promise((resolve, reject) => {
      // Register one-time handler for data response
      const unsubscribe = this.on(MESSAGE_TYPES.DIAGRAM_DATA, (payload) => {
        unsubscribe(); // Remove the handler after receiving the response
        resolve(payload);
      });
      
      // Send request for data
      this.sendMessage(MESSAGE_TYPES.REQUEST_DATA);
      
      // Set timeout for response
      setTimeout(() => {
        unsubscribe();
        reject(new Error('Timeout waiting for diagram data'));
      }, 10000); // 10 second timeout
    });
  }
  
  /**
   * Notify parent about authentication state change
   */
  notifyAuthStateChange(isAuthenticated, user = null) {
    this.sendMessage(MESSAGE_TYPES.AUTH_STATE_CHANGE, {
      isAuthenticated,
      userId: user?.id
    });
  }
  
  /**
   * Notify parent about simulation status
   */
  notifySimulationStatus(status, data = {}) {
    switch (status) {
      case 'started':
        this.sendMessage(MESSAGE_TYPES.SIMULATION_STARTED, data);
        break;
      case 'completed':
        this.sendMessage(MESSAGE_TYPES.SIMULATION_COMPLETED, data);
        break;
      case 'error':
        this.sendMessage(MESSAGE_TYPES.SIMULATION_ERROR, data);
        break;
      default:
        console.warn(`Unknown simulation status: ${status}`);
    }
  }
}

// Create singleton instance
export const frameService = new FrameService();

// Initialize service when module is imported
frameService.initialize();
```

## Step 3: Create Frame Message Handler Component

Create a component to handle frame communication within your React application:

```jsx
// src/components/FrameMessageHandler.jsx
import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { frameService } from '../services/frameService';
import { MESSAGE_TYPES } from '../utils/messageTypes';
import { useSimulation } from '../contexts/SimulationContext';
import { useTheme } from '../contexts/ThemeContext';

export const FrameMessageHandler = () => {
  const { isAuthenticated, user, login } = useAuth();
  const { startSimulation, stopSimulation } = useSimulation();
  const { setTheme } = useTheme();
  
  // Effect to notify parent about authentication state changes
  useEffect(() => {
    frameService.notifyAuthStateChange(isAuthenticated, user);
  }, [isAuthenticated, user]);
  
  // Effect to handle messages from LucidChart
  useEffect(() => {
    // Handler for init message
    const handleInit = (payload) => {
      console.log('Received initialization data from LucidChart', payload);
      
      // Apply any configuration from payload
      if (payload.theme) {
        setTheme(payload.theme);
      }
    };
    
    // Handler for authentication request
    const handleRequestAuth = () => {
      if (!isAuthenticated) {
        login();
      } else {
        // Already authenticated, notify parent
        frameService.notifyAuthStateChange(isAuthenticated, user);
      }
    };
    
    // Handler for run simulation request
    const handleRunSimulation = (payload) => {
      startSimulation(payload);
    };
    
    // Handler for theme change
    const handleThemeChange = (payload) => {
      setTheme(payload.theme);
    };
    
    // Register message handlers
    const unsubscribeInit = frameService.on(MESSAGE_TYPES.INIT, handleInit);
    const unsubscribeRequestAuth = frameService.on(MESSAGE_TYPES.REQUEST_AUTH, handleRequestAuth);
    const unsubscribeRunSimulation = frameService.on(MESSAGE_TYPES.RUN_SIMULATION, handleRunSimulation);
    const unsubscribeThemeChange = frameService.on(MESSAGE_TYPES.THEME_CHANGE, handleThemeChange);
    
    // Clean up handlers on unmount
    return () => {
      unsubscribeInit();
      unsubscribeRequestAuth();
      unsubscribeRunSimulation();
      unsubscribeThemeChange();
    };
  }, [isAuthenticated, user, login, startSimulation, setTheme]);
  
  // This component doesn't render anything
  return null;
};
```

## Step 4: Implement Communication in LucidChart Extension

In your LucidChart extension, implement the other side of the communication:

```typescript
// editorextensions/quodsi_editor_extension/src/components/QuodsiPanel.ts
import { EditorClient, Panel, PanelLocation } from 'lucid-extension-sdk';

export class QuodsiPanel extends Panel {
  constructor(client: EditorClient) {
    super(client, {
      title: 'Quodsi Simulation',
      iconUrl: 'https://your-cdn.example.com/quodsi-icon.png',
      location: PanelLocation.RightDock,
      url: 'quodsim-react/index.html', // Path to React app entry point
      persist: true, // Keep panel loaded to maintain auth state
    });
    
    // Set up message handling from React app
    this.setupMessageHandlers();
    
    // Track current authentication state
    this.isAuthenticated = false;
  }
  
  // Initialize the React app
  public show(): void {
    super.show();
    
    // After showing the panel, send initialization data
    setTimeout(() => {
      this.sendInitData();
    }, 500); // Small delay to ensure iframe is loaded
  }
  
  // Send initialization data to the React app
  private sendInitData(): void {
    this.sendMessage({
      source: 'lucidchart',
      type: 'INIT',
      payload: {
        theme: this.client.getTheme(),
        // Other configuration data
      }
    });
  }
  
  // Set up message handlers
  private setupMessageHandlers(): void {
    // Handle messages from the React app
    this.onMessage((message) => {
      // Validate message
      if (!message || typeof message !== 'object' || message.source !== 'quodsi') {
        return;
      }
      
      const { type, payload } = message;
      
      // Handle different message types
      switch (type) {
        case 'READY':
          // React app is ready, send init data
          this.sendInitData();
          break;
          
        case 'AUTH_STATE_CHANGE':
          // Track authentication state
          this.isAuthenticated = payload.isAuthenticated;
          // Update UI or take action based on auth state
          this.handleAuthStateChange(payload.isAuthenticated, payload.userId);
          break;
          
        case 'REQUEST_DATA':
          // React app is requesting diagram data
          this.sendDiagramData();
          break;
          
        case 'SIMULATION_STARTED':
          // Simulation has started
          console.log('Simulation started:', payload);
          // Show loading indicator or update UI
          break;
          
        case 'SIMULATION_COMPLETED':
          // Simulation has completed
          console.log('Simulation completed:', payload);
          // Show results or update UI
          break;
          
        case 'SIMULATION_ERROR':
          // Simulation encountered an error
          console.error('Simulation error:', payload);
          // Show error message
          break;
          
        default:
          console.log(`Unhandled message type: ${type}`);
      }
    });
  }
  
  // Handle authentication state changes
  private handleAuthStateChange(isAuthenticated: boolean, userId?: string): void {
    console.log(`Auth state changed: ${isAuthenticated}, user: ${userId || 'unknown'}`);
    
    // Update panel UI based on authentication state
    if (isAuthenticated) {
      // User is authenticated, enable simulation features
    } else {
      // User is not authenticated, show login prompt
    }
  }
  
  // Send diagram data to the React app
  private async sendDiagramData(): Promise<void> {
    try {
      // Get diagram data from LucidChart
      const viewport = this.client.getViewport();
      const selection = viewport.getSelectedItems();
      const diagram = await this.extractDiagramData(selection);
      
      // Send data to React app
      this.sendMessage({
        source: 'lucidchart',
        type: 'DIAGRAM_DATA',
        payload: diagram
      });
    } catch (error) {
      console.error('Error getting diagram data:', error);
    }
  }
  
  // Extract data from LucidChart diagram
  private async extractDiagramData(selection: any[]): Promise<any> {
    // Implement your diagram data extraction logic here
    // This will depend on your specific requirements
    
    // Example implementation
    const diagramData = {
      nodes: [],
      edges: [],
      properties: {}
    };
    
    // Process selection items
    for (const item of selection) {
      if (item.type === 'block') {
        // Process blocks (nodes)
        diagramData.nodes.push({
          id: item.id,
          type: item.shapeType,
          text: item.getText(),
          position: item.getPosition(),
          size: item.getSize(),
          data: item.getData()
        });
      } else if (item.type === 'line') {
        // Process lines (edges)
        diagramData.edges.push({
          id: item.id,
          from: item.getStartBlockId(),
          to: item.getEndBlockId(),
          text: item.getText(),
          points: item.getPoints(),
          data: item.getData()
        });
      }
    }
    
    return diagramData;
  }
  
  // Request authentication from the user
  public requestAuthentication(): void {
    if (!this.isAuthenticated) {
      this.sendMessage({
        source: 'lucidchart',
        type: 'REQUEST_AUTH'
      });
    }
  }
  
  // Run a simulation with the current diagram
  public runSimulation(config?: any): void {
    if (!this.isAuthenticated) {
      // Request authentication first
      this.requestAuthentication();
      return;
    }
    
    // Send run simulation message
    this.sendMessage({
      source: 'lucidchart',
      type: 'RUN_SIMULATION',
      payload: {
        config,
        timestamp: Date.now()
      }
    });
  }
}
```

## Step 5: Create Theme Context for LucidChart Theming

Implement a theme context to handle LucidChart's themes:

```jsx
// src/contexts/ThemeContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';

// Create Theme Context
const ThemeContext = createContext();

// Theme Provider Component
export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('light');
  
  // Update CSS variables based on theme
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.style.setProperty('--background-color', '#2b2b2b');
      root.style.setProperty('--text-color', '#ffffff');
      root.style.setProperty('--primary-color', '#4a8af4');
      root.style.setProperty('--secondary-color', '#6e6e6e');
      root.style.setProperty('--border-color', '#444444');
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.style.setProperty('--background-color', '#ffffff');
      root.style.setProperty('--text-color', '#333333');
      root.style.setProperty('--primary-color', '#2d7ff9');
      root.style.setProperty('--secondary-color', '#e6e6e6');
      root.style.setProperty('--border-color', '#dddddd');
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }
  }, [theme]);
  
  // Theme setter function
  const setTheme = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setThemeState(newTheme);
    } else {
      console.warn(`Invalid theme: ${newTheme}`);
    }
  };
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
```

## Step 6: Update App Component with Providers

Update your App component to include the necessary providers:

```jsx
// src/App.jsx
import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SimulationProvider } from './contexts/SimulationContext';
import { FrameMessageHandler } from './components/FrameMessageHandler';
import { LoginButton } from './components/auth/LoginButton';
import { ProtectedContent } from './components/auth/ProtectedContent';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SimulationProvider>
          <div className="quodsi-app">
            {/* Handle messages from LucidChart iframe */}
            <FrameMessageHandler />
            
            <header className="app-header">
              <h1>Quodsi Simulation</h1>
              <LoginButton />
            </header>
            
            <main className="app-content">
              <ProtectedContent
                fallback={
                  <div className="welcome-screen">
                    <h2>Welcome to Quodsi</h2>
                    <p>Please sign in to start creating process simulations.</p>
                    <LoginButton />
                  </div>
                }
              >
                {/* Protected application content */}
                <div className="dashboard">
                  <h2>Your Simulations Dashboard</h2>
                  {/* Simulation components go here */}
                </div>
              </ProtectedContent>
            </main>
          </div>
        </SimulationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
```

## Step 7: Implement Security Measures

Add security measures to protect against potential vulnerabilities:

```javascript
// src/utils/securityUtil.js

/**
 * Validate message origin
 */
export function isValidOrigin(origin) {
  const allowedOrigins = [
    'https://lucid.app',
    'https://chart.lucid.app',
    'https://app.lucid.co'
  ];
  
  // Add development origins if in development mode
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000');
  }
  
  return allowedOrigins.includes(origin);
}

/**
 * Sanitize data received from parent frame
 * to prevent XSS attacks
 */
export function sanitizeData(data) {
  // Implement appropriate sanitization based on your data structure
  // This is a simple example and should be expanded based on your needs
  
  if (!data) return null;
  
  // Handle different data types
  if (typeof data === 'string') {
    // Sanitize strings
    return data.replace(/[<>]/g, (char) => {
      return char === '<' ? '&lt;' : '&gt;';
    });
  } else if (Array.isArray(data)) {
    // Sanitize arrays
    return data.map(item => sanitizeData(item));
  } else if (typeof data === 'object') {
    // Sanitize objects
    const sanitized = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitized[key] = sanitizeData(data[key]);
      }
    }
    return sanitized;
  }
  
  // Return primitive values as is
  return data;
}

/**
 * Validate message structure
 */
export function isValidMessage(message) {
  return (
    message &&
    typeof message === 'object' &&
    (message.source === 'lucidchart' || message.source === 'quodsi') &&
    typeof message.type === 'string'
  );
}
```

## Step 8: Create Error Handling for Communication

Implement better error handling for communication failures:

```javascript
// src/services/frameService.js - additional methods

/**
 * Handle communication errors
 */
handleCommunicationError(error, messageType) {
  console.error(`Communication error (${messageType}):`, error);
  
  // Track error in monitoring system if applicable
  if (window.appInsights) {
    window.appInsights.trackException({
      exception: error,
      properties: {
        messageType,
        component: 'FrameService'
      }
    });
  }
  
  // Notify UI if needed
  if (this.errorHandler) {
    this.errorHandler({
      type: 'COMMUNICATION_ERROR',
      messageType,
      error: error.message
    });
  }
  
  // Attempt to recover communication if possible
  this.recoverCommunication();
}

/**
 * Try to recover communication
 */
recoverCommunication() {
  // If we haven't sent a READY message recently, send one
  const now = Date.now();
  if (!this.lastReadyTimestamp || now - this.lastReadyTimestamp > 60000) {
    this.lastReadyTimestamp = now;
    this.sendMessage(MESSAGE_TYPES.READY);
  }
}

/**
 * Set error handler
 */
setErrorHandler(handler) {
  this.errorHandler = handler;
}

/**
 * Check if we're still in an iframe context
 */
checkFrameContext() {
  // If we were in a frame but now we're not, something went wrong
  if (this.isLucidChartFrame && window.parent === window) {
    this.handleCommunicationError(
      new Error('Frame context lost'),
      'CONTEXT_LOST'
    );
    this.isLucidChartFrame = false;
    return false;
  }
  
  return this.isLucidChartFrame;
}
```

## Step 9: Testing and Debugging Tips

### 9.1 Test in Development Environment

During development, test iframe communication with a local HTML file:

```html
<!-- test-iframe.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Quodsi Iframe Test</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    iframe { width: 100%; height: 600px; border: 1px solid #ccc; }
    .controls { margin-bottom: 20px; }
    .log { background: #f5f5f5; padding: 10px; height: 200px; overflow: auto; }
  </style>
</head>
<body>
  <h1>Quodsi Iframe Test</h1>
  
  <div class="controls">
    <button id="send-init">Send Init</button>
    <button id="request-auth">Request Auth</button>
    <button id="send-theme">Send Theme: Dark</button>
  </div>
  
  <iframe src="http://localhost:3000"></iframe>
  
  <h3>Message Log:</h3>
  <pre class="log" id="log"></pre>
  
  <script>
    const iframe = document.querySelector('iframe');
    const log = document.getElementById('log');
    
    // Log messages
    function logMessage(direction, type, data) {
      const entry = document.createElement('div');
      entry.textContent = `${new Date().toLocaleTimeString()} ${direction} ${type}: ${JSON.stringify(data)}`;
      log.prepend(entry);
    }
    
    // Listen for messages from iframe
    window.addEventListener('message', event => {
      if (event.source === iframe.contentWindow) {
        const { source, type, payload } = event.data;
        if (source === 'quodsi') {
          logMessage('←', type, payload);
        }
      }
    });
    
    // Send message to iframe
    function sendMessage(type, payload = {}) {
      iframe.contentWindow.postMessage({
        source: 'lucidchart',
        type,
        payload
      }, '*');
      logMessage('→', type, payload);
    }
    
    // Button event listeners
    document.getElementById('send-init').addEventListener('click', () => {
      sendMessage('INIT', { theme: 'light' });
    });
    
    document.getElementById('request-auth').addEventListener('click', () => {
      sendMessage('REQUEST_AUTH');
    });
    
    document.getElementById('send-theme').addEventListener('click', () => {
      sendMessage('THEME_CHANGE', { theme: 'dark' });
    });
  </script>
</body>
</html>
```

### 9.2 Chrome DevTools Extension

Create a Chrome DevTools extension for debugging iframe communication:

```javascript
// chrome-extension/content-script.js
// This script injects into the page to monitor postMessage

// Track all postMessage calls
const originalPostMessage = window.postMessage;
window.postMessage = function(message, targetOrigin, transfer) {
  // Call original function
  const result = originalPostMessage.call(this, message, targetOrigin, transfer);
  
  // Log intercepted messages
  if (message && (message.source === 'quodsi' || message.source === 'lucidchart')) {
    console.log(`[PostMessage] To: ${targetOrigin}`, message);
    
    // Send to DevTools panel
    window.dispatchEvent(new CustomEvent('quodsi-message', {
      detail: {
        timestamp: Date.now(),
        direction: 'out',
        message,
        targetOrigin
      }
    }));
  }
  
  return result;
};

// Listen for incoming messages
window.addEventListener('message', function(event) {
  const message = event.data;
  
  if (message && (message.source === 'quodsi' || message.source === 'lucidchart')) {
    console.log(`[PostMessage] From: ${event.origin}`, message);
    
    // Send to DevTools panel
    window.dispatchEvent(new CustomEvent('quodsi-message', {
      detail: {
        timestamp: Date.now(),
        direction: 'in',
        message,
        origin: event.origin
      }
    }));
  }
});

// Let the panel know we're ready
console.log('[Quodsi DevTools] Content script loaded');
```

## Step 10: Production Checklist

Before deploying to production, check the following:

1. **Origin Validation**: Ensure all message origins are properly validated
2. **Error Handling**: Implement robust error handling for communication failures
3. **Payload Sanitization**: Sanitize all data received from postMessage
4. **Security Headers**: Configure appropriate security headers in the backend
5. **Cross-Browser Testing**: Test in all major browsers
6. **Authentication Flow**: Verify authentication works reliably in the iframe
7. **Monitoring**: Implement monitoring for communication failures
8. **Performance**: Optimize message payloads for performance
9. **Documentation**: Document the communication protocol for future maintenance

## Next Steps

After implementing iframe communication:

1. Complete [subscription checks](./subscription_checks.md) implementation
2. Set up [error handling](./error_handling.md) for common scenarios
3. Integrate with [token validation](../05-backend_implementation/token_validation.md) in the backend
4. Test the complete [authentication flow](../07-testing/authentication_testing.md) in LucidChart
