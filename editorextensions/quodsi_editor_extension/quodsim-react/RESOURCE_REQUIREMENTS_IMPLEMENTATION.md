# Resource Requirements UI - Implementation Summary

## ✅ Completed Components

### 1. **Conversion Utilities** (`utils/resourceRequirementConverter.ts`)
- `TeamStructure` interface - UI-friendly structure for resource requirements
- `convertStructureToRootClauses()` - Converts UI structure to backend RequirementClause[]
- `convertRootClausesToStructure()` - Converts backend structure to UI structure
- `generatePreview()` - Creates human-readable preview text

### 2. **ResourceRequirementModal** (`features/editors/ResourceRequirementModal.tsx`)
- Full modal for creating/editing resource requirements
- **Templates Tab**: Pre-defined patterns based on available resources
- **Build Custom Tab**: Team-based builder with:
  - Top-level ALL/ANY mode selector
  - Team-level ALL/ANY mode selector (for teams with 2+ resources)
  - Purple team cards with add/remove functionality
  - Duplicate resource prevention
  - Real-time preview
- Required name field with validation
- Auto-loads template when editing existing requirement

### 3. **ResourceRequirementsManager** (`features/editors/ResourceRequirementsManager.tsx`)
- List view of all resource requirements
- Shows preview, team count, and mode for each requirement
- Usage count badges (placeholder - needs backend integration)
- Add/Edit/Delete actions
- Warning on delete if requirement is in use

### 4. **ModelEditor Updates** (`features/editors/ModelEditor.tsx`)
- Added new "Requirements" tab with Package icon
- Integrated ResourceRequirementsManager
- Integrated ResourceRequirementModal
- Handlers for add/edit/delete (with TODO placeholders for messaging)
- Proper state management for modal open/close

### 5. **ElementEditor Updates** (`features/modelPanel/ElementEditor.tsx`)
- Passes referenceData to ModelEditor
- Ensures resource requirements are available in Model editor

## 🚧 Still To Do

### Phase 1: Backend Integration (Critical)
The ModelEditor currently has TODO comments for:

```typescript
// In ModelEditor.tsx - onDelete handler
// TODO: Send delete message to extension

// In ModelEditor.tsx - onSave handler  
// TODO: Send update/create message to extension

// In ModelEditor.tsx - getUsageCount
// TODO: Calculate actual usage count from activities
```

**Action Items:**
1. Create message sender functions for ResourceRequirement CRUD operations
2. Implement usage count calculation by checking all activities' operation steps
3. Handle requirement updates properly through the messaging system
4. Ensure ModelDefinition.resourceRequirements is updated when changes occur

### Phase 2: OperationStepEditor Updates (High Priority)
File: `features/editors/OperationStepEditor.tsx`

**Current State:**
- Has simple dropdown for resource requirements
- Shows requirement name only

**Needed Changes:**
1. Add "+ Create New..." option to dropdown
2. Add Edit button next to dropdown (when requirement selected)
3. Add preview of selected requirement below dropdown
4. Handle modal open/close from OperationStep context
5. Update handlers to support new workflow

**Code Template:**
```typescript
<div className="flex gap-1">
  <select
    value={step.requirementId || ""}
    onChange={handleRequirementChange}
    className="flex-1 px-1 py-0.5 text-xs border rounded"
  >
    <option value="">None</option>
    <option value="__new__">+ Create New...</option>
    {resourceRequirements.map((req) => (
      <option key={req.id} value={req.id}>{req.name}</option>
    ))}
  </select>
  {step.requirementId && step.requirementId !== '__new__' && (
    <button onClick={() => onEditRequirement(step.requirementId!)}>
      <Edit2 size={14} />
    </button>
  )}
</div>
```

### Phase 3: ActivityEditor Updates (Medium Priority)
File: `features/editors/ActivityEditor.tsx`

**Needed:**
- Pass modal control props to OperationStepEditor
- May need to manage modal state at Activity level or bubble up to ModelPanel
- Consider if modal should be shared between ModelEditor and ActivityEditor

### Phase 4: Messaging Integration (Critical)
**New Message Types Needed:**
```typescript
// In messaging/types or similar
interface ResourceRequirementCreateMessage {
  type: 'resourceRequirement:create';
  requirement: ResourceRequirement;
}

interface ResourceRequirementUpdateMessage {
  type: 'resourceRequirement:update';
  id: string;
  requirement: ResourceRequirement;
}

interface ResourceRequirementDeleteMessage {
  type: 'resourceRequirement:delete';
  id: string;
}
```

**Message Handlers Needed:**
- Extension-side handlers to update ModelDefinition
- React-side senders in `messaging/senders/`
- Update referenceData when requirements change

### Phase 5: Testing Checklist

#### Unit Testing
- [ ] Conversion utilities handle all edge cases
- [ ] Team structure with nested ANY/ALL modes
- [ ] Single team, multiple teams scenarios
- [ ] Empty requirements, single resource, multiple resources

#### Integration Testing
- [ ] Create requirement from ModelEditor tab
- [ ] Edit requirement from ModelEditor tab  
- [ ] Delete requirement with usage warning
- [ ] Create requirement from OpStep editor
- [ ] Edit requirement from OpStep editor
- [ ] Select requirement in OpStep dropdown
- [ ] Preview updates correctly
- [ ] Templates load with available resources
- [ ] Team mode toggles work correctly
- [ ] Duplicate resource prevention works
- [ ] Modal state resets properly

#### User Flow Testing
- [ ] User creates resources first
- [ ] User navigates to Model → Requirements tab
- [ ] User creates requirement from template
- [ ] User modifies requirement in custom builder
- [ ] User uses requirement in Activity OpStep
- [ ] User edits requirement from OpStep
- [ ] Changes reflect everywhere requirement is used

## 📁 File Structure

```
src/
├── utils/
│   └── resourceRequirementConverter.ts        [NEW - ✅ Complete]
│
├── features/
│   ├── editors/
│   │   ├── ResourceRequirementModal.tsx      [NEW - ✅ Complete]
│   │   ├── ResourceRequirementsManager.tsx   [NEW - ✅ Complete]
│   │   ├── ModelEditor.tsx                   [UPDATED - ✅ Complete]
│   │   ├── OperationStepEditor.tsx           [TODO - Needs updates]
│   │   └── ActivityEditor.tsx                [TODO - May need updates]
│   │
│   └── modelPanel/
│       └── ElementEditor.tsx                  [UPDATED - ✅ Complete]
│
└── messaging/
    └── senders/
        └── resourceRequirementSender.ts      [TODO - Needs creation]
```

## 🎯 Next Steps

### Immediate (To make it functional):
1. **Implement messaging for ResourceRequirement CRUD** - Without this, changes won't persist
2. **Update OperationStepEditor** - Users need to access requirements from OpSteps
3. **Implement usage count calculation** - Important for delete warnings

### Soon After:
4. Test conversion utilities with real data
5. Add proper error handling for edge cases
6. Consider caching/optimization for large requirement lists

### Future Enhancements:
- Drag-and-drop for reordering teams
- Copy/duplicate requirements
- Import/export requirement templates
- Validation messages inline (not just alerts)
- Requirement preview in ActivityEditor list view
