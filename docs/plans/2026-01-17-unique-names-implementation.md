# Unique Names Per Type - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce unique names for simulation objects within each type at conversion time and edit time.

**Architecture:** Core validation in `@quodsi/shared` (ModelDefinition methods + utility functions), called by extension during conversion and by React editors during name changes. Leverages existing `EditorReferenceData` for client-side validation without additional message round-trips.

**Tech Stack:** TypeScript, Jest (shared tests), React (editor validation)

---

## Task 1: Add isNameUniqueForType to ModelDefinition

**Files:**
- Modify: `shared/src/types/elements/ModelDefinition.ts`
- Create: `shared/tests/types/elements/ModelDefinition.test.ts`

**Step 1: Write the failing test**

Create `shared/tests/types/elements/ModelDefinition.test.ts`:

```typescript
import { ModelDefinition } from '../../../src/types/elements/ModelDefinition';
import { Model } from '../../../src/types/elements/Model';
import { Activity } from '../../../src/types/elements/Activity';
import { Resource } from '../../../src/types/elements/Resource';
import { SimulationObjectType } from '../../../src/types/elements/SimulationObjectType';

describe('ModelDefinition', () => {
    let modelDef: ModelDefinition;

    beforeEach(() => {
        const model = new Model('test-model', 'Test Model');
        modelDef = new ModelDefinition(model);
    });

    describe('isNameUniqueForType', () => {
        it('returns true when no objects exist for the type', () => {
            const result = modelDef.isNameUniqueForType(
                SimulationObjectType.Activity,
                'Triage'
            );
            expect(result).toBe(true);
        });

        it('returns true when name does not conflict', () => {
            const activity = new Activity('act-1', 'Triage', 1, Infinity, Infinity, [], 0, 0);
            modelDef.activities.add(activity);

            const result = modelDef.isNameUniqueForType(
                SimulationObjectType.Activity,
                'Registration'
            );
            expect(result).toBe(true);
        });

        it('returns false when name conflicts with existing object', () => {
            const activity = new Activity('act-1', 'Triage', 1, Infinity, Infinity, [], 0, 0);
            modelDef.activities.add(activity);

            const result = modelDef.isNameUniqueForType(
                SimulationObjectType.Activity,
                'Triage'
            );
            expect(result).toBe(false);
        });

        it('returns true when name exists for different type', () => {
            const activity = new Activity('act-1', 'Triage', 1, Infinity, Infinity, [], 0, 0);
            modelDef.activities.add(activity);

            const result = modelDef.isNameUniqueForType(
                SimulationObjectType.Resource,
                'Triage'
            );
            expect(result).toBe(true);
        });

        it('excludes specified ID from conflict check', () => {
            const activity = new Activity('act-1', 'Triage', 1, Infinity, Infinity, [], 0, 0);
            modelDef.activities.add(activity);

            const result = modelDef.isNameUniqueForType(
                SimulationObjectType.Activity,
                'Triage',
                'act-1'
            );
            expect(result).toBe(true);
        });

        it('still detects conflict when excludeId does not match', () => {
            const activity = new Activity('act-1', 'Triage', 1, Infinity, Infinity, [], 0, 0);
            modelDef.activities.add(activity);

            const result = modelDef.isNameUniqueForType(
                SimulationObjectType.Activity,
                'Triage',
                'act-99'
            );
            expect(result).toBe(false);
        });
    });
});
```

**Step 2: Run test to verify it fails**

Run: `cd shared && npm test -- ModelDefinition.test.ts`

Expected: FAIL - `isNameUniqueForType` is not a function

**Step 3: Write minimal implementation**

Add to `shared/src/types/elements/ModelDefinition.ts` (after existing methods):

```typescript
/**
 * Checks if a name is unique among objects of the given type.
 * @param type - The simulation object type to check within
 * @param name - The name to check
 * @param excludeId - Optional ID to exclude (for editing existing objects)
 * @returns true if the name is unique, false if it conflicts
 */
public isNameUniqueForType(
    type: SimulationObjectType,
    name: string,
    excludeId?: string
): boolean {
    const objects = this.getObjectsByType(type);
    return !objects.some(obj => obj.name === name && obj.id !== excludeId);
}

/**
 * Gets all objects of a given type.
 * @param type - The simulation object type
 * @returns Array of simulation objects
 */
private getObjectsByType(type: SimulationObjectType): Array<{ id: string; name: string }> {
    switch (type) {
        case SimulationObjectType.Activity:
            return this.activities.getAll();
        case SimulationObjectType.Resource:
            return this.resources.getAll();
        case SimulationObjectType.Generator:
            return this.generators.getAll();
        case SimulationObjectType.Entity:
            return this.entities.getAll();
        case SimulationObjectType.Connector:
            return this.connectors.getAll();
        default:
            return [];
    }
}
```

Add import at top of file:
```typescript
import { SimulationObjectType } from './SimulationObjectType';
```

**Step 4: Run test to verify it passes**

Run: `cd shared && npm test -- ModelDefinition.test.ts`

Expected: PASS (all 6 tests)

**Step 5: Commit**

```bash
git add shared/src/types/elements/ModelDefinition.ts shared/tests/types/elements/ModelDefinition.test.ts
git commit -m "feat(shared): add isNameUniqueForType to ModelDefinition"
```

---

## Task 2: Add getUsedNamesForType to ModelDefinition

**Files:**
- Modify: `shared/src/types/elements/ModelDefinition.ts`
- Modify: `shared/tests/types/elements/ModelDefinition.test.ts`

**Step 1: Write the failing test**

Add to `shared/tests/types/elements/ModelDefinition.test.ts`:

```typescript
describe('getUsedNamesForType', () => {
    it('returns empty array when no objects exist', () => {
        const result = modelDef.getUsedNamesForType(SimulationObjectType.Activity);
        expect(result).toEqual([]);
    });

    it('returns all names for the given type', () => {
        const act1 = new Activity('act-1', 'Triage', 1, Infinity, Infinity, [], 0, 0);
        const act2 = new Activity('act-2', 'Treatment', 1, Infinity, Infinity, [], 0, 0);
        modelDef.activities.add(act1);
        modelDef.activities.add(act2);

        const result = modelDef.getUsedNamesForType(SimulationObjectType.Activity);
        expect(result).toContain('Triage');
        expect(result).toContain('Treatment');
        expect(result).toHaveLength(2);
    });

    it('does not include names from other types', () => {
        const activity = new Activity('act-1', 'Triage', 1, Infinity, Infinity, [], 0, 0);
        const resource = new Resource('res-1', 'Nurse', 1);
        modelDef.activities.add(activity);
        modelDef.resources.add(resource);

        const activityNames = modelDef.getUsedNamesForType(SimulationObjectType.Activity);
        expect(activityNames).toContain('Triage');
        expect(activityNames).not.toContain('Nurse');
    });
});
```

**Step 2: Run test to verify it fails**

Run: `cd shared && npm test -- ModelDefinition.test.ts`

Expected: FAIL - `getUsedNamesForType` is not a function

**Step 3: Write minimal implementation**

Add to `shared/src/types/elements/ModelDefinition.ts`:

```typescript
/**
 * Gets all names currently in use for a given type.
 * @param type - The simulation object type
 * @returns Array of names in use
 */
public getUsedNamesForType(type: SimulationObjectType): string[] {
    return this.getObjectsByType(type).map(obj => obj.name);
}
```

**Step 4: Run test to verify it passes**

Run: `cd shared && npm test -- ModelDefinition.test.ts`

Expected: PASS (all 9 tests)

**Step 5: Commit**

```bash
git add shared/src/types/elements/ModelDefinition.ts shared/tests/types/elements/ModelDefinition.test.ts
git commit -m "feat(shared): add getUsedNamesForType to ModelDefinition"
```

---

## Task 3: Create nameUtils.ts with generateUniqueName

**Files:**
- Create: `shared/src/utils/nameUtils.ts`
- Create: `shared/tests/utils/nameUtils.test.ts`

**Step 1: Write the failing test**

Create `shared/tests/utils/nameUtils.test.ts`:

```typescript
import { generateUniqueName } from '../../src/utils/nameUtils';

describe('generateUniqueName', () => {
    it('appends truncated element ID as suffix', () => {
        const result = generateUniqueName('Triage', 'block-abc123xyz789');
        expect(result).toBe('Triage_xyz789');
    });

    it('uses default suffix length of 6', () => {
        const result = generateUniqueName('Test', '123456789012');
        expect(result).toBe('Test_789012');
    });

    it('respects custom suffix length', () => {
        const result = generateUniqueName('Test', 'abcdefghij', 4);
        expect(result).toBe('Test_ghij');
    });

    it('handles short element IDs', () => {
        const result = generateUniqueName('Test', 'abc');
        expect(result).toBe('Test_abc');
    });

    it('handles empty base name', () => {
        const result = generateUniqueName('', 'element123');
        expect(result).toBe('_nt123');
    });
});
```

**Step 2: Run test to verify it fails**

Run: `cd shared && npm test -- nameUtils.test.ts`

Expected: FAIL - Cannot find module

**Step 3: Write minimal implementation**

Create `shared/src/utils/nameUtils.ts`:

```typescript
/**
 * Name utilities for ensuring unique simulation object names.
 */

/**
 * Generates a unique name by appending a truncated element ID suffix.
 * @param baseName - The original name (e.g., "Triage")
 * @param elementId - The platform element ID to use as suffix
 * @param suffixLength - How many characters of ID to append (default: 6)
 * @returns Unique name like "Triage_a1b2c3"
 */
export function generateUniqueName(
    baseName: string,
    elementId: string,
    suffixLength: number = 6
): string {
    const suffix = elementId.slice(-suffixLength);
    return `${baseName}_${suffix}`;
}
```

**Step 4: Run test to verify it passes**

Run: `cd shared && npm test -- nameUtils.test.ts`

Expected: PASS (all 5 tests)

**Step 5: Commit**

```bash
git add shared/src/utils/nameUtils.ts shared/tests/utils/nameUtils.test.ts
git commit -m "feat(shared): add generateUniqueName utility"
```

---

## Task 4: Add ensureUniqueName to nameUtils.ts

**Files:**
- Modify: `shared/src/utils/nameUtils.ts`
- Modify: `shared/tests/utils/nameUtils.test.ts`

**Step 1: Write the failing test**

Add to `shared/tests/utils/nameUtils.test.ts`:

```typescript
import { generateUniqueName, ensureUniqueName } from '../../src/utils/nameUtils';
import { ModelDefinition } from '../../src/types/elements/ModelDefinition';
import { Model } from '../../src/types/elements/Model';
import { Activity } from '../../src/types/elements/Activity';
import { SimulationObjectType } from '../../src/types/elements/SimulationObjectType';

describe('ensureUniqueName', () => {
    let modelDef: ModelDefinition;

    beforeEach(() => {
        const model = new Model('test-model', 'Test Model');
        modelDef = new ModelDefinition(model);
    });

    it('returns original name when unique', () => {
        const result = ensureUniqueName(
            modelDef,
            SimulationObjectType.Activity,
            'Triage',
            'element-123'
        );
        expect(result).toBe('Triage');
    });

    it('returns suffixed name when duplicate exists', () => {
        const activity = new Activity('act-1', 'Triage', 1, Infinity, Infinity, [], 0, 0);
        modelDef.activities.add(activity);

        const result = ensureUniqueName(
            modelDef,
            SimulationObjectType.Activity,
            'Triage',
            'element-abc123'
        );
        expect(result).toBe('Triage_abc123');
    });

    it('allows same name for different types', () => {
        const activity = new Activity('act-1', 'Triage', 1, Infinity, Infinity, [], 0, 0);
        modelDef.activities.add(activity);

        const result = ensureUniqueName(
            modelDef,
            SimulationObjectType.Resource,
            'Triage',
            'element-xyz789'
        );
        expect(result).toBe('Triage');
    });
});
```

**Step 2: Run test to verify it fails**

Run: `cd shared && npm test -- nameUtils.test.ts`

Expected: FAIL - `ensureUniqueName` is not exported

**Step 3: Write minimal implementation**

Add to `shared/src/utils/nameUtils.ts`:

```typescript
import { ModelDefinition } from '../types/elements/ModelDefinition';
import { SimulationObjectType } from '../types/elements/SimulationObjectType';

/**
 * Ensures a name is unique for the given type, generating a suffixed
 * version if necessary.
 * @param model - The ModelDefinition to check against
 * @param type - The simulation object type
 * @param name - The desired name
 * @param elementId - The element ID for suffix generation
 * @returns The original name if unique, or a suffixed version
 */
export function ensureUniqueName(
    model: ModelDefinition,
    type: SimulationObjectType,
    name: string,
    elementId: string
): string {
    if (model.isNameUniqueForType(type, name)) {
        return name;
    }
    return generateUniqueName(name, elementId);
}
```

**Step 4: Run test to verify it passes**

Run: `cd shared && npm test -- nameUtils.test.ts`

Expected: PASS (all 8 tests)

**Step 5: Commit**

```bash
git add shared/src/utils/nameUtils.ts shared/tests/utils/nameUtils.test.ts
git commit -m "feat(shared): add ensureUniqueName utility"
```

---

## Task 5: Export nameUtils from shared package

**Files:**
- Modify: `shared/src/index.ts`

**Step 1: Verify current exports**

Run: `cd shared && grep -n "nameUtils\|NameParser" src/index.ts`

Expected: Should see NameParser export but no nameUtils

**Step 2: Add export**

Add to `shared/src/index.ts` (after the NameParser export line):

```typescript
export * from './utils/nameUtils';
```

**Step 3: Build to verify**

Run: `cd shared && npm run build`

Expected: Build succeeds without errors

**Step 4: Commit**

```bash
git add shared/src/index.ts
git commit -m "feat(shared): export nameUtils from package"
```

---

## Task 6: Create nameValidation.ts for React editors

**Files:**
- Create: `shared/src/utils/nameValidation.ts`
- Create: `shared/tests/utils/nameValidation.test.ts`

**Step 1: Write the failing test**

Create `shared/tests/utils/nameValidation.test.ts`:

```typescript
import { isNameUniqueInReferenceData } from '../../src/utils/nameValidation';
import { EditorReferenceData } from '../../src/types/EditorReferenceData';
import { SimulationObjectType } from '../../src/types/elements/SimulationObjectType';

describe('isNameUniqueInReferenceData', () => {
    const referenceData: EditorReferenceData = {
        activities: [
            { id: 'act-1', name: 'Triage' },
            { id: 'act-2', name: 'Treatment' },
        ],
        resources: [
            { id: 'res-1', name: 'Nurse' },
        ],
        generators: [
            { id: 'gen-1', name: 'Patient Arrivals' },
        ],
        entities: [
            { id: 'ent-1', name: 'Patient' },
        ],
    };

    it('returns true when name does not exist', () => {
        const result = isNameUniqueInReferenceData(
            referenceData,
            SimulationObjectType.Activity,
            'Registration'
        );
        expect(result).toBe(true);
    });

    it('returns false when name already exists for same type', () => {
        const result = isNameUniqueInReferenceData(
            referenceData,
            SimulationObjectType.Activity,
            'Triage'
        );
        expect(result).toBe(false);
    });

    it('returns true when name exists for different type', () => {
        const result = isNameUniqueInReferenceData(
            referenceData,
            SimulationObjectType.Resource,
            'Triage'
        );
        expect(result).toBe(true);
    });

    it('excludes current element when excludeId provided', () => {
        const result = isNameUniqueInReferenceData(
            referenceData,
            SimulationObjectType.Activity,
            'Triage',
            'act-1'
        );
        expect(result).toBe(true);
    });

    it('still detects conflict when excludeId does not match', () => {
        const result = isNameUniqueInReferenceData(
            referenceData,
            SimulationObjectType.Activity,
            'Triage',
            'act-99'
        );
        expect(result).toBe(false);
    });

    it('handles missing reference data gracefully', () => {
        const emptyData: EditorReferenceData = {};
        const result = isNameUniqueInReferenceData(
            emptyData,
            SimulationObjectType.Activity,
            'Anything'
        );
        expect(result).toBe(true);
    });

    it('handles undefined arrays gracefully', () => {
        const partialData: EditorReferenceData = {
            resources: [{ id: 'res-1', name: 'Nurse' }],
        };
        const result = isNameUniqueInReferenceData(
            partialData,
            SimulationObjectType.Activity,
            'Nurse'
        );
        expect(result).toBe(true);
    });
});
```

**Step 2: Run test to verify it fails**

Run: `cd shared && npm test -- nameValidation.test.ts`

Expected: FAIL - Cannot find module

**Step 3: Write minimal implementation**

Create `shared/src/utils/nameValidation.ts`:

```typescript
import { EditorReferenceData } from '../types/EditorReferenceData';
import { SimulationObjectType } from '../types/elements/SimulationObjectType';

/**
 * Gets items array for a given type from reference data.
 */
function getItemsForType(
    data: EditorReferenceData,
    type: SimulationObjectType
): Array<{ id: string; name: string }> {
    switch (type) {
        case SimulationObjectType.Activity:
            return data.activities || [];
        case SimulationObjectType.Resource:
            return data.resources || [];
        case SimulationObjectType.Generator:
            return data.generators || [];
        case SimulationObjectType.Entity:
            return data.entities || [];
        default:
            return [];
    }
}

/**
 * Checks if a name is unique within the reference data for a given type.
 * Used by React editors for client-side validation without message round-trips.
 *
 * @param referenceData - The EditorReferenceData from the extension
 * @param type - The simulation object type
 * @param name - The name to check
 * @param excludeId - Current element ID (when editing existing element)
 * @returns true if the name is unique, false if it conflicts
 */
export function isNameUniqueInReferenceData(
    referenceData: EditorReferenceData,
    type: SimulationObjectType,
    name: string,
    excludeId?: string
): boolean {
    const items = getItemsForType(referenceData, type);
    return !items.some(item => item.name === name && item.id !== excludeId);
}
```

**Step 4: Run test to verify it passes**

Run: `cd shared && npm test -- nameValidation.test.ts`

Expected: PASS (all 7 tests)

**Step 5: Export from index.ts**

Add to `shared/src/index.ts`:

```typescript
export * from './utils/nameValidation';
```

**Step 6: Build to verify**

Run: `cd shared && npm run build`

Expected: Build succeeds

**Step 7: Commit**

```bash
git add shared/src/utils/nameValidation.ts shared/tests/utils/nameValidation.test.ts shared/src/index.ts
git commit -m "feat(shared): add isNameUniqueInReferenceData for React editors"
```

---

## Task 7: Integrate ensureUniqueName in LucidPageConversionService

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/src/services/conversion/LucidPageConversionService.ts`

**Step 1: Add import**

Add at top of `LucidPageConversionService.ts`:

```typescript
import { ensureUniqueName } from '@quodsi/shared';
```

**Step 2: Modify convertElementsWithMappings**

In the `convertElementsWithMappings` method, after `const element = platformObject.getSimulationObject();` (around line 255), add:

```typescript
// Ensure unique name before registration
const model = await this.modelManager.getModelDefinition();
if (model) {
    element.name = ensureUniqueName(model, targetType, element.name, blockId);
}
```

**Step 3: Modify convertBlocks**

In the `convertBlocks` method, after `const element = platformObject.getSimulationObject();` (around line 379), add:

```typescript
// Ensure unique name before registration
const model = await this.modelManager.getModelDefinition();
if (model) {
    element.name = ensureUniqueName(model, blockAnalysis.elementType, element.name, blockId);
}
```

**Step 4: Build extension to verify**

Run: `cd editorextensions/quodsi_editor_extension && npm run build`

Expected: Build succeeds

**Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/src/services/conversion/LucidPageConversionService.ts
git commit -m "feat(extension): integrate ensureUniqueName during conversion"
```

---

## Task 8: Add name validation to ActivityEditor

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ActivityEditor.tsx`

**Step 1: Add imports**

Add at top of `ActivityEditor.tsx`:

```typescript
import { isNameUniqueInReferenceData } from '@quodsi/shared';
```

**Step 2: Add validation state**

After the `const [expandedActions, setExpandedActions]` line (around line 272), add:

```typescript
// Name validation state
const [nameError, setNameError] = useState<string | null>(null);
```

**Step 3: Add validation function**

After the `updateActivityImmutably` helper function, add:

```typescript
/**
 * Validates that the activity name is unique among all activities.
 * @param name - The name to validate
 * @returns Error message if invalid, null if valid
 */
const validateName = (name: string): string | null => {
    if (!name.trim()) {
        return 'Name is required';
    }
    if (referenceData && !isNameUniqueInReferenceData(
        referenceData,
        SimulationObjectType.Activity,
        name,
        localActivityDraft.id
    )) {
        return `An Activity named "${name}" already exists`;
    }
    return null;
};
```

**Step 4: Modify handleInputChange**

Replace the `if (name === "name")` block with:

```typescript
if (name === "name") {
    updates.name = value;
    // Validate name uniqueness
    const error = validateName(value);
    setNameError(error);
}
```

**Step 5: Modify save button disabled logic**

Find the Save button (search for `onClick={handleSave}`) and update its disabled condition to include nameError:

```typescript
disabled={!hasPendingChanges || elementOpsState.isSaving || nameError !== null}
```

**Step 6: Add error display**

After the name input field, add error message display:

```typescript
{nameError && (
    <p className="text-xs text-red-500 mt-1">{nameError}</p>
)}
```

**Step 7: Build React app to verify**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`

Expected: Build succeeds

**Step 8: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ActivityEditor.tsx
git commit -m "feat(react): add name uniqueness validation to ActivityEditor"
```

---

## Task 9: Add name validation to ResourceEditor

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ResourceEditor.tsx`

**Step 1: Read current file structure**

Examine ResourceEditor.tsx to understand its current structure and identify where to add validation (similar pattern to ActivityEditor).

**Step 2: Add imports**

Add at top of `ResourceEditor.tsx`:

```typescript
import { isNameUniqueInReferenceData } from '@quodsi/shared';
```

**Step 3: Add validation state and function**

Add after existing state declarations:

```typescript
const [nameError, setNameError] = useState<string | null>(null);

const validateName = (name: string): string | null => {
    if (!name.trim()) {
        return 'Name is required';
    }
    if (referenceData && !isNameUniqueInReferenceData(
        referenceData,
        SimulationObjectType.Resource,
        name,
        localResource.id // or whatever the local state variable is named
    )) {
        return `A Resource named "${name}" already exists`;
    }
    return null;
};
```

**Step 4: Modify name change handler**

Update the name field change handler to call `validateName` and set `nameError`.

**Step 5: Update save button and add error display**

Add `nameError !== null` to disabled condition and add error message below name input.

**Step 6: Build and verify**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`

**Step 7: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ResourceEditor.tsx
git commit -m "feat(react): add name uniqueness validation to ResourceEditor"
```

---

## Task 10: Add name validation to GeneratorEditor

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/GeneratorEditor.tsx`

Follow same pattern as Task 9, using `SimulationObjectType.Generator`.

**Commit:**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/GeneratorEditor.tsx
git commit -m "feat(react): add name uniqueness validation to GeneratorEditor"
```

---

## Task 11: Add name validation to EntityEditor

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/EntityEditor.tsx`

Follow same pattern as Task 9, using `SimulationObjectType.Entity`.

**Commit:**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/EntityEditor.tsx
git commit -m "feat(react): add name uniqueness validation to EntityEditor"
```

---

## Task 12: Run all tests and final verification

**Step 1: Run shared library tests**

Run: `cd shared && npm test`

Expected: All tests pass

**Step 2: Build shared library**

Run: `cd shared && npm run build`

Expected: Build succeeds

**Step 3: Build extension**

Run: `cd editorextensions/quodsi_editor_extension && npm run build`

Expected: Build succeeds

**Step 4: Build React app**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`

Expected: Build succeeds

**Step 5: Final commit (if any uncommitted changes)**

```bash
git status
# If clean, create a summary tag or note
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add isNameUniqueForType | ModelDefinition.ts |
| 2 | Add getUsedNamesForType | ModelDefinition.ts |
| 3 | Create generateUniqueName | nameUtils.ts |
| 4 | Add ensureUniqueName | nameUtils.ts |
| 5 | Export nameUtils | index.ts |
| 6 | Create isNameUniqueInReferenceData | nameValidation.ts |
| 7 | Integrate in conversion service | LucidPageConversionService.ts |
| 8 | Add validation to ActivityEditor | ActivityEditor.tsx |
| 9 | Add validation to ResourceEditor | ResourceEditor.tsx |
| 10 | Add validation to GeneratorEditor | GeneratorEditor.tsx |
| 11 | Add validation to EntityEditor | EntityEditor.tsx |
| 12 | Final verification | All |
