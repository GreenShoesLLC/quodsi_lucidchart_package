// quodsim-react/src/features/editors/__tests__/modelEditorSeam.tsx
//
// Test seam for the Model editor (spec 2026-09-12): the REAL production chain
// -- the extension's own projectModelRoot -> createModelRootSource ->
// createLucidModelStateAccessor -- with only the postMessage transport faked.
// projectModelRoot only calls .getAll() on a definition's lists and .toJSON()
// on four of them, so `definition()` builds a duck-typed ModelDefinition (the
// extension's own projection tests do the same) and the real mapping runs.
//
// Not a test file (no ".test." in the name), so Vitest does not collect it.
// Test files that render tab wrappers must mock MessageProvider themselves.

import React, { useSyncExternalStore } from 'react'
import { render } from '@testing-library/react'
import { PeriodUnit, SimulationTimeType } from '@quodsi/lucid-shared'
import type { ModelDefinition, ModelRootProjection } from '@quodsi/lucid-shared'
import { projectModelRoot } from '../../../../../src/core/modelRootProjection'
import { createModelRootSource, type ModelRootTransport } from '../../../adapters/useModelRootSource'
import { createLucidModelStateAccessor } from '../../../adapters/LucidModelStateAccessor'
import ModelEditor from '../ModelEditor'

type ListKey =
  | 'generators' | 'arrivalPatterns' | 'arrivalSchedules' | 'workSchedules' | 'activities'
  | 'connectors' | 'entities' | 'states' | 'resources' | 'resourceRequirements'

const LIST_KEYS: ListKey[] = [
  'generators', 'arrivalPatterns', 'arrivalSchedules', 'workSchedules', 'activities',
  'connectors', 'entities', 'states', 'resources', 'resourceRequirements',
]

/** Lists whose rows projectModelRoot serializes with .toJSON(). */
const TO_JSON_KEYS = new Set<ListKey>(['arrivalPatterns', 'arrivalSchedules', 'workSchedules', 'resourceRequirements'])

export type DefinitionParts = Partial<Record<ListKey, Array<Record<string, unknown>>>> & {
  model?: Record<string, unknown>
}

/**
 * A duck-typed ModelDefinition. The model's fields default to values that trip
 * no complexity-view tell (10 replications, minutes, clock, no warmup).
 */
export function definition(parts: DefinitionParts = {}): ModelDefinition {
  const def: Record<string, unknown> = {
    model: {
      id: 'model-1',
      name: 'My Model',
      description: '',
      replications: 10,
      seed: 12345,
      timeUnit: PeriodUnit.MINUTES,
      timeMode: SimulationTimeType.Clock,
      warmupTime: { value: 0, unit: PeriodUnit.HOURS },
      runTime: { value: 24, unit: PeriodUnit.HOURS },
      warmupDateTime: null,
      startDateTime: null,
      finishDateTime: null,
      levers: [],
      ...parts.model,
    },
  }
  for (const key of LIST_KEYS) {
    const rows = parts[key] ?? []
    def[key] = {
      getAll: () => (TO_JSON_KEYS.has(key) ? rows.map((row) => ({ ...row, toJSON: () => row })) : rows),
    }
  }
  return def as unknown as ModelDefinition
}

type FakeTransport = ModelRootTransport & {
  send: ReturnType<typeof vi.fn>
  saveShape: ReturnType<typeof vi.fn>
}

/** The real source + accessor, fed projectModelRoot(def) as a MODEL_ROOT_SNAPSHOT would feed it. */
export function modelRootSeam(def: ModelDefinition, transportOverrides: Partial<ModelRootTransport> = {}, pageId = 'page-1') {
  const transport = {
    send: vi.fn().mockResolvedValue(undefined),
    saveShape: vi.fn().mockResolvedValue(undefined),
    ...transportOverrides,
  } as FakeTransport
  const source = createModelRootSource(transport)
  source.acceptSnapshot({ ...projectModelRoot(def), pageId })
  const accessor = createLucidModelStateAccessor(source.deps)

  /**
   * Accept a host snapshot: the CURRENT projection (echo included) with
   * `modelChanges` applied flat and under `model`, and `rootChanges` applied
   * at the root. Call inside act().
   */
  const pushSnapshot = (modelChanges: Record<string, unknown> = {}, rootChanges: Record<string, unknown> = {}) => {
    const current = source.deps.getModelDefinition() as Record<string, unknown>
    source.acceptSnapshot({
      ...current,
      ...rootChanges,
      ...modelChanges,
      model: { ...(current.model as Record<string, unknown>), ...modelChanges },
    } as unknown as ModelRootProjection)
  }

  return { transport, source, accessor, pushSnapshot }
}

type EditorOptions = {
  transport?: Partial<ModelRootTransport>
  props?: Partial<Omit<React.ComponentProps<typeof ModelEditor>, 'accessor' | 'projection'>>
}

/** Render ModelEditor over the seam, re-rendering on every echo and snapshot like ModelEditorForPage does. */
export function mountModelEditor(def: ModelDefinition = definition(), options: EditorOptions = {}) {
  const seam = modelRootSeam(def, options.transport)
  function Harness() {
    const projection = useSyncExternalStore(
      seam.source.deps.onModelChanged,
      seam.source.deps.getModelDefinition,
    ) as unknown as ModelRootProjection
    return <ModelEditor accessor={seam.accessor} projection={projection} {...options.props} />
  }
  return { ...seam, ...render(<Harness />) }
}
