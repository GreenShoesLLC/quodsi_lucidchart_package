# Quodsi Application Startup Flow

## 1. Extension Initialization

### Initial Load
When a LucidChart document is opened with Quodsi installed:
```typescript
const client = new EditorClient();
const menu = new Menu(client);
const viewport = new Viewport(client);
const document = new DocumentProxy(client);
const rightPanel = new RightPanel(client);
```

### RightPanel Setup
The RightPanel is instantiated with:
- Width: 264px (LucidChart constraint)
- Height: Full viewport height
- Location: Right dock
- Content: React application loaded from 'quodsim-react/index.html'

## 2. React Application Bootstrap

### Initial React Load
1. index.tsx mounts the App component in strict mode
2. App.tsx initializes with:
   - Empty editor state
   - Null document ID
   - Undefined component type
   - Processing flag set to false

### Event Listener Setup
```typescript
useEffect(() => {
    const eventListener = (event: MessageEvent) => {
        handleMessage(event.data as LucidChartMessage);
    };
    window.addEventListener("message", eventListener);
    // Cleanup on unmount
    return () => window.removeEventListener("message", eventListener);
}, []);
```

## 3. Communication Handshake

### React Ready Signal
Once mounted, React sends:
```typescript
window.parent.postMessage({
    messagetype: 'reactAppReady'
}, '*');
```

### Extension Response
RightPanel receives 'reactAppReady' and:
1. Sets reactAppReady flag
2. Checks viewport selection
3. Determines appropriate initial view
4. Sends configuration message to React

## 4. Selection-Based Initialization

### No Selection (Page Level)
If no shapes/lines selected:
1. Checks for existing model data
2. If no model:
   - Shows ConvertPageToModel interface
3. If model exists:
   - Shows ModelEditor interface

### Shape/Line Selected
If element selected:
1. Retrieves element's simulation data
2. Shows appropriate editor based on element type

## 5. State Management

### Key States Tracked
```typescript
const [editor, setEditor] = useState<JSX.Element | null>(null);
const [documentId, setDocumentId] = useState<string | null>(null);
const [currentComponentType, setCurrentComponentType] = useState<
    SimComponentType | undefined
>();
const [isProcessing, setIsProcessing] = useState(false);
```

### Data Persistence
- Uses LucidChart's shapeData API
- Two key attributes:
  - q_objecttype: Component type identifier
  - q_data: Serialized component data

## 6. Error Handling

### Startup Safeguards
- Validates React readiness before sending messages
- Checks document/page availability
- Verifies selection state
- Handles missing or malformed data

### Recovery Mechanisms
- Fallback to ConvertPageToModel on errors
- Logging for debugging
- User feedback for issues

## 7. Component Selection Flow

### SimulationComponentSelector
- Displays available component types
- Handles type changes
- Updates UI based on selection

### Editor Component Resolution
```typescript
const getEditorComponent = (message: LucidChartMessage, instanceData: any) => {
    switch (message.simtype) {
        case "ValidateModel":
            return <ModelUtilities />;
        case "model":
            return <ModelTabs />;
        // ... other cases
    }
};
```
