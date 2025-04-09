# Field Selection Strategy for Autosave

## Current State: All Fields Require Manual Save

In the current implementation, all fields in the Quodsi editor components require manual saving:

1. **Universal Manual Save**: Every field change requires clicking the Save button
2. **No Field Differentiation**: All fields are treated with the same save workflow
3. **Consistent But Inefficient**: Provides consistency but creates extra work for users
4. **One-Size-Fits-All Approach**: Ignores differences in field importance and edit frequency

Example of current ConnectorEditor:
```tsx
<div className="quodsi-field">
  <label htmlFor="probability" className="quodsi-label">
    Probability
  </label>
  <input
    type="number"
    id="probability"
    name="probability"
    className="quodsi-input"
    value={localConnector.probability}
    onChange={handleChange}
    step="0.01"
    min="0"
    max="1"
  />
</div>

<div className="quodsi-button-group">
  <button type="submit" className="quodsi-button quodsi-button-primary">
    Save
  </button>
  <button
    type="button"
    onClick={onCancel}
    className="quodsi-button quodsi-button-secondary"
  >
    Cancel
  </button>
</div>
```

## Future State: Strategic Field Selection for Autosave

Not all fields benefit equally from autosave. The future implementation will strategically select which fields should autosave based on specific criteria:

### Selection Criteria for Autosave Fields

Fields should be considered for autosave when they meet these criteria:

1. **Frequency of Changes**: Fields that users edit frequently
2. **Low Impact of Errors**: Fields where incorrect values have minimal consequences
3. **Simple Validation**: Fields with straightforward validation rules
4. **Value Independence**: Fields that don't affect many other fields
5. **User Expectation**: Fields where users would expect immediate updates

### Field Analysis for Quodsi Components

#### ConnectorEditor

| Field | Autosave Candidate? | Rationale |
|-------|---------------------|-----------|
| **Probability** | Yes | Frequently adjusted, numeric with simple validation, users expect quick feedback |
| **Connect Type** | No | Categorical value with significant impact on model behavior, less frequently changed |

#### ActivityEditor

| Field | Autosave Candidate? | Rationale |
|-------|---------------------|-----------|
| **Name** | No | Critical identifier, should be carefully reviewed |
| **Process Time** | Yes | Frequently tuned parameter with simple validation |
| **Resource Requirements** | No | Complex relationships, impacts model significantly |
| **Description** | Yes | Free text field with low impact on model function |

#### ResourceEditor

| Field | Autosave Candidate? | Rationale |
|-------|---------------------|-----------|
| **Name** | No | Critical identifier that should be reviewed |
| **Capacity** | Yes | Frequently adjusted with simple validation |
| **Cost** | Yes | Simple numeric field with frequent adjustments |

### Implementation Strategy

The implementation will use a flexible registration approach:

```typescript
// In ComponentEditor.tsx
useEffect(() => {
  // Register which fields should autosave
  setAutoSaveFields([
    'probability',  // ConnectorEditor
    'processTime',  // ActivityEditor
    'capacity',     // ResourceEditor
    'description'   // Various editors
  ]);
}, [setAutoSaveFields]);
```

This approach allows each editor component to independently determine which fields should autosave, providing flexibility across the application.

### Field Categories and Treatment

We can categorize fields into three groups:

1. **Always Autosave**: Fields that always benefit from autosave
   - Simple numeric parameters (probability, duration)
   - Non-critical text fields (descriptions, notes)
   - Toggle switches and checkboxes

2. **Never Autosave**: Fields that should always require manual save
   - Critical identifiers (names, IDs)
   - Fields with complex downstream effects
   - Multi-select or relationship fields

3. **Configurable**: Fields where autosave behavior could be user-configurable
   - Secondary identifiers
   - Fields with moderate impact
   - Fields with varying frequency of updates

### Phased Implementation Approach

We recommend a phased approach to implementing autosave for fields:

#### Phase 1: Core Numeric Parameters
- Implement autosave for the most straightforward candidates:
  - Probability in ConnectorEditor
  - Process time in ActivityEditor
  - Capacity in ResourceEditor

#### Phase 2: Text and Descriptive Fields
- Extend autosave to text fields with low impact:
  - Description fields
  - Comment fields
  - Tag fields

#### Phase 3: User Configuration
- Consider adding user preferences for autosave behavior:
  - Global autosave toggle
  - Per-field autosave settings
  - Autosave timing configuration

### UI Differentiation

To maintain a clear user experience, fields with different save behaviors should have distinct visual treatments:

1. **Autosave Fields**:
   - Include "Auto-saves when changed" help text
   - Potentially use a different input style or icon
   - Show save status indicators

2. **Manual Save Fields**:
   - No autosave indicators
   - May include "Requires save" text for clarity
   - Standard input styling

Example autosave field:
```tsx
<div className="quodsi-field quodsi-autosave-field">
  <label htmlFor="probability" className="quodsi-label">
    Probability
  </label>
  <div className="quodsi-input-group">
    <input
      type="number"
      id="probability"
      name="probability"
      className="quodsi-input"
      value={localConnector.probability}
      onChange={handleChange}
      step="0.01"
      min="0"
      max="1"
    />
    <small className="quodsi-help-text">
      <span className="quodsi-autosave-icon">⟳</span> Auto-saves when changed
    </small>
  </div>
</div>
```

Example manual save field:
```tsx
<div className="quodsi-field">
  <label htmlFor="connectType" className="quodsi-label">
    Connect Type
  </label>
  <select
    id="connectType"
    name="connectType"
    className="quodsi-select"
    value={localConnector.connectType}
    onChange={handleChange}
  >
    {Object.keys(ConnectType).map((key) => (
      <option key={key} value={ConnectType[key as keyof typeof ConnectType]}>
        {key}
      </option>
    ))}
  </select>
</div>
```

### Data-Driven Refinement

As users interact with the autosave functionality, usage data should be collected to refine the field selection strategy:

1. **Change Frequency Metrics**: Track how often each field is edited
2. **Save Timing**: Measure time between edits and saves
3. **User Behavior**: Observe if users manually save autosave fields
4. **Error Rates**: Monitor validation errors by field type

This data will help optimize the autosave field selection over time, ensuring the feature enhances rather than hinders the user experience.
