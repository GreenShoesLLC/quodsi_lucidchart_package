# Configuration Options for Autosave

## Current Configuration State

The current implementation has no configurable options for save behavior:

1. **Uniform Save Behavior**: All fields follow the same manual save pattern
2. **No User Preferences**: No options for users to customize save behavior
3. **Hard-Coded Parameters**: Debounce timing and other parameters are fixed
4. **One-Size-Fits-All**: No adaptation to different use cases or contexts

## Future Configuration Strategy

A flexible configuration system will enhance the autosave implementation, allowing customization at multiple levels:

### 1. Global Configuration

Application-wide settings that affect all autosave functionality:

```typescript
// Global configuration types
interface GlobalAutosaveConfig {
  enabled: boolean;              // Master toggle for autosave
  defaultDebounceTime: number;   // Default debounce in milliseconds
  maxRetries: number;            // Maximum retry attempts
  useLocalStorage: boolean;      // Whether to use localStorage backup
  showSaveIndicators: boolean;   // Whether to show save status indicators
  logLevel: 'error' | 'warn' | 'info' | 'debug'; // Logging verbosity
}

// Default global configuration
const defaultGlobalConfig: GlobalAutosaveConfig = {
  enabled: true,
  defaultDebounceTime: 800,
  maxRetries: 3,
  useLocalStorage: true,
  showSaveIndicators: true,
  logLevel: 'error'
};

// Global configuration context
const AutosaveConfigContext = React.createContext<{
  config: GlobalAutosaveConfig;
  updateConfig: (updates: Partial<GlobalAutosaveConfig>) => void;
}>({
  config: defaultGlobalConfig,
  updateConfig: () => {}
});

// Configuration provider component
const AutosaveConfigProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [config, setConfig] = useState<GlobalAutosaveConfig>(defaultGlobalConfig);
  
  const updateConfig = useCallback((updates: Partial<GlobalAutosaveConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...updates
    }));
  }, []);
  
  return (
    <AutosaveConfigContext.Provider value={{ config, updateConfig }}>
      {children}
    </AutosaveConfigContext.Provider>
  );
};

// Hook for using the configuration
const useAutosaveConfig = () => useContext(AutosaveConfigContext);
```

### 2. Component-Level Configuration

Each component can have specific autosave settings:

```typescript
// Component configuration types
interface ComponentAutosaveConfig {
  enabled?: boolean;             // Override global enabled setting
  debounceTime?: number;         // Component-specific debounce time
  validateBeforeSave?: boolean;  // Whether to validate before save
  maxConcurrentSaves?: number;   // Maximum concurrent save operations
}

// Example component configuration
const ActivityEditorConfig: ComponentAutosaveConfig = {
  debounceTime: 1200,            // Longer debounce for complex component
  maxConcurrentSaves: 1          // Only allow one save at a time
};

// Component usage example
const MyComponent: React.FC = () => {
  const { config: globalConfig } = useAutosaveConfig();
  const componentConfig: ComponentAutosaveConfig = {
    debounceTime: 600  // Override for this component
  };
  
  const effectiveConfig = {
    ...globalConfig,
    ...componentConfig
  };
  
  // Use effective configuration
  // ...
};
```

### 3. Field-Level Configuration

Individual fields can have custom autosave behavior:

```typescript
// Field configuration type
interface FieldAutosaveConfig {
  enabled: boolean;                // Whether this field uses autosave
  debounceTime?: number;           // Field-specific debounce
  saveOn?: ('change' | 'blur' | 'both'); // When to trigger save
  validateImmediately?: boolean;   // Validate on each change
  confirmChanges?: boolean;        // Require confirmation for large changes
  dependentFields?: string[];      // Other fields to update together
}

// Field registry in BaseEditor
const [fieldConfigs, setFieldConfigs] = useState<{
  [fieldName: string]: FieldAutosaveConfig
}>({});

// Register a field for autosave with configuration
const registerAutosaveField = (
  fieldName: string, 
  config: FieldAutosaveConfig
) => {
  setFieldConfigs(prev => ({
    ...prev,
    [fieldName]: config
  }));
  
  // If enabled, add to autosave fields
  if (config.enabled) {
    setAutoSaveFields(prev => {
      if (prev.includes(fieldName)) return prev;
      return [...prev, fieldName];
    });
  }
};

// Component usage
useEffect(() => {
  // Register fields with custom configuration
  registerAutosaveField('probability', {
    enabled: true,
    debounceTime: 500,
    saveOn: 'change'
  });
  
  registerAutosaveField('connectType', {
    enabled: false // No autosave
  });
}, [registerAutosaveField]);
```

### 4. User Preference Configuration

Allow users to customize their autosave experience:

```typescript
// User preference types
interface UserAutosavePreferences {
  autosaveEnabled: boolean;       // User's master toggle
  debouncePreference: 'fast' | 'medium' | 'slow'; // User's timing preference
  fieldPreferences: {             // Per-field preferences
    [fieldType: string]: boolean
  };
  showIndicators: boolean;        // Whether to show indicators
}

// Default user preferences
const defaultUserPreferences: UserAutosavePreferences = {
  autosaveEnabled: true,
  debouncePreference: 'medium',
  fieldPreferences: {
    'probability': true,
    'processTime': true,
    'capacity': true
  },
  showIndicators: true
};

// Load user preferences from storage
const loadUserPreferences = (): UserAutosavePreferences => {
  try {
    const stored = localStorage.getItem('quodsi_autosave_preferences');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load user preferences:', e);
  }
  return defaultUserPreferences;
};

// Save user preferences
const saveUserPreferences = (prefs: UserAutosavePreferences): void => {
  try {
    localStorage.setItem('quodsi_autosave_preferences', JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save user preferences:', e);
  }
};

// User preferences provider
const UserPreferencesProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserAutosavePreferences>(
    loadUserPreferences()
  );
  
  const updatePreferences = useCallback((updates: Partial<UserAutosavePreferences>) => {
    setPreferences(prev => {
      const newPrefs = {
        ...prev,
        ...updates
      };
      saveUserPreferences(newPrefs);
      return newPrefs;
    });
  }, []);
  
  return (
    <UserPreferencesContext.Provider value={{ preferences, updatePreferences }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};
```

### 5. Environment-Based Configuration

Adapt configuration based on environment conditions:

```typescript
// Environment detection utility
const detectEnvironment = () => {
  const isLowBandwidth = navigator.connection?.downlink < 1;
  const isLowPower = navigator.getBattery && navigator.getBattery().then(b => b.level < 0.2);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  return {
    isLowBandwidth,
    isLowPower,
    isMobile
  };
};

// Adjust configuration based on environment
const getAdaptiveConfig = (baseConfig: GlobalAutosaveConfig): GlobalAutosaveConfig => {
  const env = detectEnvironment();
  
  // Adjust for low-bandwidth conditions
  if (env.isLowBandwidth) {
    return {
      ...baseConfig,
      defaultDebounceTime: baseConfig.defaultDebounceTime * 2, // Double debounce time
      useLocalStorage: true // Ensure local storage is used
    };
  }
  
  // Adjust for mobile
  if (env.isMobile) {
    return {
      ...baseConfig,
      showSaveIndicators: true // Always show indicators on mobile
    };
  }
  
  return baseConfig;
};
```

## Configuration UI

A user interface for configuration would include:

### 1. Global Settings Panel

```tsx
const GlobalSettingsPanel: React.FC = () => {
  const { config, updateConfig } = useAutosaveConfig();
  const { preferences, updatePreferences } = useUserPreferences();
  
  return (
    <div className="quodsi-settings-panel">
      <h3>Autosave Settings</h3>
      
      <div className="quodsi-setting-group">
        <label className="quodsi-setting-toggle">
          <span>Enable Autosave</span>
          <input
            type="checkbox"
            checked={config.enabled && preferences.autosaveEnabled}
            onChange={e => {
              updatePreferences({ autosaveEnabled: e.target.checked });
            }}
          />
        </label>
        
        <div className="quodsi-setting-item">
          <span>Save Timing</span>
          <select
            value={preferences.debouncePreference}
            onChange={e => updatePreferences({ 
              debouncePreference: e.target.value as 'fast' | 'medium' | 'slow' 
            })}
          >
            <option value="fast">Fast (300ms)</option>
            <option value="medium">Medium (800ms)</option>
            <option value="slow">Slow (1500ms)</option>
          </select>
        </div>
        
        <label className="quodsi-setting-toggle">
          <span>Show Save Indicators</span>
          <input
            type="checkbox"
            checked={preferences.showIndicators}
            onChange={e => updatePreferences({ 
              showIndicators: e.target.checked 
            })}
          />
        </label>
      </div>
      
      <h4>Field Preferences</h4>
      <div className="quodsi-field-preferences">
        {Object.entries(preferences.fieldPreferences).map(([field, enabled]) => (
          <label key={field} className="quodsi-field-toggle">
            <span>{getFieldDisplayName(field)}</span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => {
                updatePreferences({
                  fieldPreferences: {
                    ...preferences.fieldPreferences,
                    [field]: e.target.checked
                  }
                });
              }}
            />
          </label>
        ))}
      </div>
      
      <button 
        className="quodsi-button"
        onClick={() => updatePreferences(defaultUserPreferences)}
      >
        Reset to Defaults
      </button>
    </div>
  );
};
```

### 2. Inline Field Configuration

```tsx
const FieldConfigDropdown: React.FC<{fieldName: string}> = ({ fieldName }) => {
  const { preferences, updatePreferences } = useUserPreferences();
  const enabled = preferences.fieldPreferences[fieldName] || false;
  
  return (
    <div className="quodsi-field-config-dropdown">
      <button className="quodsi-field-config-toggle">⚙️</button>
      
      <div className="quodsi-field-config-menu">
        <label className="quodsi-field-config-option">
          <input 
            type="checkbox"
            checked={enabled}
            onChange={e => {
              updatePreferences({
                fieldPreferences: {
                  ...preferences.fieldPreferences,
                  [fieldName]: e.target.checked
                }
              });
            }}
          />
          <span>Autosave this field</span>
        </label>
        
        <div className="quodsi-field-config-timing">
          <span>Save timing:</span>
          <select
            disabled={!enabled}
            onChange={e => {
              const debounceMap = {
                'fast': 300,
                'medium': 800,
                'slow': 1500
              };
              
              registerAutosaveField(fieldName, {
                enabled,
                debounceTime: debounceMap[e.target.value as keyof typeof debounceMap]
              });
            }}
          >
            <option value="fast">Fast</option>
            <option value="medium">Medium</option>
            <option value="slow">Slow</option>
          </select>
        </div>
      </div>
    </div>
  );
};
```

## Configuration Storage Strategy

Configuration will be stored at different levels:

1. **Application Defaults**: Hard-coded values for reference
2. **User Preferences**: Stored in localStorage for persistence
3. **Session Configuration**: Stored in React state during session
4. **Field Registry**: Tracked in component state

The hierarchy of configuration will be:

```
Application Defaults
↓
User Preferences (stored)
↓
Environment Adaptations
↓
Component-Level Config
↓
Field-Level Config
```

Each level overrides settings from the level above it, allowing for targeted customization while maintaining sensible defaults.

## Configuration Best Practices

When implementing the configuration system, follow these best practices:

1. **Default to Usability**: Choose default values that work well for most users
2. **Progressive Disclosure**: Hide advanced options until needed
3. **Context-Appropriate Defaults**: Set different defaults for different components
4. **Performance Monitoring**: Adjust configuration based on performance data
5. **User Testing**: Test configuration options with real users
6. **Configuration Validation**: Validate configuration values before applying them
7. **Backwards Compatibility**: Maintain support for older configuration formats

## Implementation Approach

Implement the configuration system in this order:

1. **Core Infrastructure**: Global configuration context and provider
2. **Component Integration**: Allow components to override settings
3. **Field-Level Setup**: Add field-specific configuration
4. **User Preferences**: Add user preference storage and UI
5. **Environment Adaptation**: Add environment-aware configuration

This phased approach allows for incremental implementation while providing immediate benefits at each step.
