# Model Definition UI Enhancement Planning

## Core Requirements

### Architecture Constraints
1. Extension app (ModelPanel) is the authoritative source for:
   - Model Definition
   - Validation state
   - Element relationships and hierarchies
   - Storage management

2. React UI (quodsim-react) must:
   - Rely on bidirectional message passing for all data
   - Not maintain its own model state
   - Request data updates through messages
   - Handle UI state only

### UI/UX Requirements
1. Enable users to define simulation models element by element without relying on "Convert to Model" functionality
2. Work within LucidChart's right panel constraints (300px width)
3. Support intuitive model building and validation
4. Provide context-aware interface adaptation
5. Maintain visual hierarchy and clear navigation

### Communication Requirements
1. React components must communicate with ModelPanel for:
   - Reading model structure
   - Requesting element data
   - Updating elements
   - Validation checks
   - Model modifications

2. Extension must provide:
   - Model structure updates
   - Element data updates
   - Validation results
   - Operation success/failure notifications
   - Selection state updates

## Selected Approach: Collapsible Accordion Layout

### Core Structure
- **Header Section** (always visible, ~40px)
  - Model name/status
  - Critical validation count
  - Global actions (validate, save)

- **Accordion Sections**
  - Model Tree Section
    - Collapsible tree view of model elements
    - Quick filters/search
    - Visual indicators for validation state

  - Element Editor Section
    - Property editor for selected element
    - Contextual actions

  - Validation Section
    - Expandable list of validation messages
    - Severity grouping

### Context-Aware Accordion Behaviors

1. **No Element Selected**
   - Model Tree: Expanded
   - Element Editor: Collapsed/hidden
   - Validation Messages: Partially expanded (showing summary)

2. **Element Selected**
   - Model Tree: Collapses to mini-view (showing path)
   - Element Editor: Expands to show full editor
   - Validation Messages: Shows element-specific messages

3. **Validation Errors Present**
   - Model Tree: Mini-view
   - Element Editor: Expanded if element has errors
   - Validation Messages: Auto-expands for critical issues

4. **During Model Building**
   - Model Tree: Expanded for adding elements
   - Element Editor: Expands when configuration needed
   - Validation Messages: Shows requirements/guidance

5. **Navigation Mode**
   - Model Tree: Fully expanded
   - Element Editor: Collapses to preview
   - Validation Messages: Summary view

## Comprehensive Message Structure Requirements

### Core Message Types

1. **Initial State / Full Refresh**
```typescript
{
    modelStructure: {
        elements: [],
        hierarchy: {}
    },
    validationState: {
        summary: {
            errorCount: number,
            warningCount: number
        },
        messages: []
    },
    currentElement: {
        data: {},
        metadata: {}
    },
    selectionState: {
        selectedIds: string[],
        selectionType: SelectionType
    }
}
```

2. **Model Structure Updates**
   - Element hierarchies
   - Parent-child relationships
   - Element type categorization
   - Quick reference data

3. **Element Details**
   - Full element properties
   - Related elements references
   - Validation state
   - Reference data for editors

4. **Validation State**
   - Global validation summary
   - Per-element validation details
   - Message severity levels
   - Element references

5. **Selection Updates**
   - Currently selected elements
   - Selection type
   - Selection context
   - Previous selection state

### Implementation Requirements

1. **Message Optimization**
   - Single comprehensive messages for major updates
   - Minimize duplicate data
   - Support partial updates
   - Maintain type safety

2. **State Management**
   - Clear state transitions
   - Predictable behavior patterns
   - User override capabilities
   - Smooth visual transitions

3. **Type Safety**
   - Strict typing for all messages
   - Payload validation
   - Runtime type checks
   - Error state handling

Would you like me to expand on any particular section or add additional details to specific aspects of this plan?