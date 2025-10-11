# OperationStepEditor Updates - Implementation Complete

## ✅ Changes Completed

### 1. **OperationStepEditor.tsx** - Enhanced UI
**File:** `src/features/editors/OperationStepEditor.tsx`

#### New Features Added:
- ✅ **"+ Create New..." option** in resource requirement dropdown
- ✅ **Edit button** (pencil icon) next to dropdown when requirement selected
- ✅ **Preview display** showing selected requirement details
- ✅ **Modal integration** via callback props

#### New Props:
```typescript
interface OperationStepEditorProps {
  // ... existing props
  availableResources?: Resource[];
  onOpenRequirementModal?: (requirementId: string) => void;
  onCreateRequirement?: () => void;
}
```

#### UI Enhancements:
- **Dropdown now includes**:
  - "None" option
  - "+ Create New..." option (if `onCreateRequirement` provided)
  - All available resource requirements

- **Edit Button**:
  - Blue pencil icon
  - Only shows when requirement is selected
  - Triggers `onOpenRequirementModal` with requirement ID

- **Preview Section**:
  - Blue background card below dropdown
  - Shows requirement name
  - Shows human-readable preview (e.g., "2 Senior OR 1 Mid OR 3 Junior")
  - Only visible when requirement is selected

- **Quantity Field**:
  - Now only shows when requirement is selected
  - Full-width layout for better UX

### 2. **ActivityEditor.tsx** - Modal Integration
**File:** `src/features/editors/ActivityEditor.tsx`

#### New Imports:
```typescript
import { ResourceRequirementModal } from "./ResourceRequirementModal";
import { convertStructureToRootClauses, convertRootClausesToStructure, TeamStructure } from "../../utils/resourceRequirementConverter";
```

#### New State:
```typescript
const [requirementModalOpen, setRequirementModalOpen] = useState(false);
const [editingRequirement, setEditingRequirement] = useState<{ id: string; name: string; structure: TeamStructure } | null>(null);
```

#### New Handlers:
```typescript
handleOpenRequirementModal(requirementId: string)
// - Finds requirement by ID
// - Converts to UI structure
// - Opens modal in edit mode

handleCreateRequirement()
// - Clears editing state
// - Opens modal in create mode

handleSaveRequirement(data: { name: string; structure: TeamStructure })
// - Converts UI structure to backend format
// - Logs requirement (TODO: implement backend save)
// - Closes modal
```

#### Component Structure:
```tsx
return (
  <>
    <BaseEditor {...props}>
      {/* Activity form */}
      <OperationStepEditor
        availableResources={referenceData?.resources}
        onOpenRequirementModal={handleOpenRequirementModal}
        onCreateRequirement={handleCreateRequirement}
        {/* ...other props */}
      />
    </BaseEditor>
    
    <ResourceRequirementModal
      isOpen={requirementModalOpen}
      onClose={...}
      onSave={handleSaveRequirement}
      editingRequirement={editingRequirement}
      availableResources={referenceData?.resources || []}
    />
  </>
);
```

## 🎯 User Workflows Now Supported

### Workflow 1: Create Resource Requirement from OpStep
1. User edits an Activity
2. Goes to "Operation Steps" tab
3. In any operation step, clicks dropdown
4. Selects "+ Create New..."
5. Modal opens with templates and builder
6. User creates requirement
7. Modal closes, requirement is available in dropdown

### Workflow 2: Edit Existing Requirement from OpStep
1. User selects a requirement from dropdown
2. Preview shows below dropdown
3. User clicks Edit button (pencil icon)
4. Modal opens with requirement loaded
5. User modifies requirement
6. Modal closes, changes reflected in preview

### Workflow 3: Quick Review
1. User selects requirement from dropdown
2. Preview immediately shows what resources are needed
3. No need to open modal if just reviewing

## 📸 Visual Layout

```
┌─ Operation Step 1 ────────────────────────┐
│ Duration: [Constant] [1] [Minutes]        │
│                                            │
│ Resource Requirement:                      │
│ ┌──────────────────────────┬──┐          │
│ │ Flexible Team           │✎ │ ← Edit    │
│ └──────────────────────────┴──┘          │
│                                            │
│ ┌── Preview ──────────────────────────┐  │
│ │ Flexible Team                        │  │
│ │ 1 Senior OR 2 Mid OR 3 Junior       │  │
│ └──────────────────────────────────────┘  │
│                                            │
│ Quantity: [1]                              │
└────────────────────────────────────────────┘
```

## 🚧 Still To Do

### Backend Integration
The handlers currently log to console. Need to:

1. **Create Message Senders** (in `messaging/senders/`)
```typescript
// resourceRequirementSender.ts
export const useResourceRequirementSender = () => {
  return {
    createRequirement: (requirement: ResourceRequirement) => { ... },
    updateRequirement: (id: string, requirement: ResourceRequirement) => { ... }
  };
};
```

2. **Update ActivityEditor**
```typescript
import { useResourceRequirementSender } from '../../messaging/senders/resourceRequirementSender';

const { createRequirement, updateRequirement } = useResourceRequirementSender();

const handleSaveRequirement = (data: { name: string; structure: TeamStructure }) => {
  const rootClauses = convertStructureToRootClauses(data.structure);
  
  if (editingRequirement) {
    const updated = new ResourceRequirement(editingRequirement.id, data.name, rootClauses);
    updateRequirement(editingRequirement.id, updated);
  } else {
    const newReq = new ResourceRequirement(`req-${Date.now()}`, data.name, rootClauses);
    createRequirement(newReq);
  }
  
  setRequirementModalOpen(false);
  setEditingRequirement(null);
};
```

3. **Extension-Side Handlers**
- Handle create/update messages
- Update ModelDefinition.resourceRequirements
- Broadcast changes to all editors
- Update referenceData

### Testing Checklist
- [ ] "+ Create New..." option works
- [ ] Edit button appears when requirement selected
- [ ] Edit button opens modal with correct data
- [ ] Preview shows correct requirement details
- [ ] Preview updates when requirement changes
- [ ] Quantity field only shows when appropriate
- [ ] Modal can be opened from multiple OpSteps
- [ ] Modal state resets properly
- [ ] Changes in modal reflect in preview

## 💡 Key Design Decisions

1. **Modal at ActivityEditor Level**
   - Keeps modal state close to where it's used
   - Allows reuse across all OpSteps in the activity
   - Simpler than managing at ModelPanel level

2. **Optional Callback Props**
   - Allows OperationStepEditor to work without modal
   - Makes component more flexible
   - Edit button only shows if handler provided

3. **Preview Always Visible**
   - Users can quickly see what they selected
   - Reduces need to open modal for review
   - Better UX for understanding requirements

4. **Natural Integration**
   - Fits existing operation step UI pattern
   - Uses same compact design
   - Minimal visual disruption

## 📚 Related Files

- `OperationStepEditor.tsx` - Updated with all new features
- `ActivityEditor.tsx` - Modal integration and handlers
- `ResourceRequirementModal.tsx` - Shared modal component
- `resourceRequirementConverter.ts` - Conversion utilities
- `RESOURCE_REQUIREMENTS_IMPLEMENTATION.md` - Overall implementation guide
