I'll help analyze the previous functionality and create a plan to integrate it into the current design. Let me check those files first.

Based on my review, here's a plan to integrate the status monitoring functionality into the current design:

1. **Add New Message Types**
First, add new message types in the shared package:

```typescript
// In @quodsi/shared MessageTypes enum
export enum MessageTypes {
  // ... existing types ...
  SIMULATION_STATUS_UPDATE = 'SIMULATION_STATUS_UPDATE',
  SIMULATION_STATUS_CHECK = 'SIMULATION_STATUS_CHECK',
  SIMULATION_STATUS_ERROR = 'SIMULATION_STATUS_ERROR'
}

// Add corresponding payload types
export interface MessagePayloads {
  // ... existing payloads ...
  [MessageTypes.SIMULATION_STATUS_UPDATE]: {
    status: PageStatus;
  };
  [MessageTypes.SIMULATION_STATUS_CHECK]: {
    documentId: string;
  };
  [MessageTypes.SIMULATION_STATUS_ERROR]: {
    error: string;
  };
}
```

2. **Update AppState in QuodsiApp**
Add simulation status to the app state:

```typescript
interface AppState {
  // ... existing state ...
  simulationStatus: {
    currentStatus: PageStatus | null;
    isChecking: boolean;
    error: string | null;
    lastChecked: string | null;
  };
}
```

3. **Create New Custom Hook**
Create a new hook that uses the ExtensionMessaging system:

```typescript
// src/hooks/useSimulationStatus.ts
import { useEffect, useCallback } from 'react';
import { ExtensionMessaging, MessageTypes, PageStatus } from '@quodsi/shared';
import axios from 'axios';

export const useSimulationStatus = (
  documentId: string,
  intervalSeconds: number = 30
) => {
  const messaging = ExtensionMessaging.getInstance();

  const checkStatus = useCallback(async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}Lucid/status/${documentId}`
      );
      
      const newStatus: PageStatus = {
        hasContainer: response.data.hasContainer,
        scenarios: response.data.scenarios || [],
        statusDateTime: new Date().toISOString()
      };

      messaging.sendMessage(MessageTypes.SIMULATION_STATUS_UPDATE, {
        status: newStatus
      });
    } catch (error) {
      messaging.sendMessage(MessageTypes.SIMULATION_STATUS_ERROR, {
        error: 'Failed to check simulation status'
      });
    }
  }, [documentId, messaging]);

  useEffect(() => {
    const intervalId = setInterval(checkStatus, intervalSeconds * 1000);
    checkStatus(); // Initial check

    return () => clearInterval(intervalId);
  }, [checkStatus, intervalSeconds]);
};
```

4. **Create New Status Monitor Component**

```typescript
// src/components/SimulationStatusMonitor.tsx
import React from 'react';
import { PageStatus } from '@quodsi/shared';

interface Props {
  status: PageStatus | null;
  isChecking: boolean;
  error: string | null;
}

export const SimulationStatusMonitor: React.FC<Props> = ({
  status,
  isChecking,
  error
}) => {
  if (error) {
    return (
      <div className="text-red-500 p-2 rounded bg-red-50">
        {error}
      </div>
    );
  }

  return (
    <div className="p-2 border rounded bg-white">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium">Simulation Status:</span>
        {isChecking ? (
          <span className="text-blue-500">Checking...</span>
        ) : (
          <span className="text-green-500">Up to date</span>
        )}
      </div>
      
      {status && (
        <div className="space-y-1 text-sm">
          <div>Container: {status.hasContainer ? '✓' : '✗'}</div>
          <div>Scenarios: {status.scenarios.length}</div>
          <div>Updated: {new Date(status.statusDateTime).toLocaleString()}</div>
        </div>
      )}
    </div>
  );
};
```

5. **Add Message Handlers**
Add handlers in the messageHandlers.ts file:

```typescript
// In src/services/messageHandlers/messageHandlers.ts

export const messageHandlers: MessageHandlers = {
  // ... existing handlers ...
  [MessageTypes.SIMULATION_STATUS_UPDATE]: (
    message: MessagePayloads[MessageTypes.SIMULATION_STATUS_UPDATE],
    { setState }: Dependencies
  ) => {
    setState(prev => ({
      ...prev,
      simulationStatus: {
        ...prev.simulationStatus,
        currentStatus: message.status,
        isChecking: false,
        lastChecked: new Date().toISOString()
      }
    }));
  },

  [MessageTypes.SIMULATION_STATUS_ERROR]: (
    message: MessagePayloads[MessageTypes.SIMULATION_STATUS_ERROR],
    { setState }: Dependencies
  ) => {
    setState(prev => ({
      ...prev,
      simulationStatus: {
        ...prev.simulationStatus,
        error: message.error,
        isChecking: false
      }
    }));
  }
};
```

6. **Update QuodsiApp**
Integrate the new components and hook:

```typescript
const QuodsiApp: React.FC = () => {
  // ... existing code ...

  // Add the hook
  useSimulationStatus(state.documentId || '', 30);

  return (
    <div className="flex flex-col h-screen">
      {/* ... existing components ... */}
      <ModelPanelAccordion
        // ... existing props ...
        simulationStatus={state.simulationStatus}
      />
    </div>
  );
};
```

7. **Extension Side Changes**
The extension needs to handle the status update message and persist it to LucidChart:

```typescript
// In extension message handling code
const handleSimulationStatusUpdate = async (message: ExtensionMessage) => {
  if (message.type === MessageTypes.SIMULATION_STATUS_UPDATE) {
    try {
      // Update LucidChart page custom data with new status
      await lucid.setPageCustomData('simulationStatus', message.payload.status);
    } catch (error) {
      console.error('Failed to update page status:', error);
    }
  }
};
```

This new design:
- Uses the ExtensionMessaging system instead of direct window.postMessage
- Maintains the polling functionality for status updates
- Integrates with the current state management approach
- Provides type safety through shared types
- Keeps the status monitoring UI component separate and reusable
- Maintains the asynchronous nature of the simulation process

Would you like me to elaborate on any part of this plan or proceed with implementation details for a specific component?