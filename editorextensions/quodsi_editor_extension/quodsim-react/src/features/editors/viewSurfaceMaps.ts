// quodsim-react/src/features/editors/viewSurfaceMaps.ts
//
// Lucid's tab ids -> the shared surface ids in @quodsi/shared. Lucid is a
// SEPARATE tab shell from quodsi_studio's (TAB_CONFIG objects keyed by
// lowercase id, versus display-string tuples), so it needs its own mapping --
// but both point at the SAME catalog, so a curation change lands in both
// hosts from one edit. See quodsi_studio/src/platforms/shared/panels/
// viewSurfaceMaps.ts for the Studio-side twin, and each editor's own
// `_TabsAreMapped` compile guard (typed against that editor's real
// `TAB_CONFIG[number]['id']`) for the exhaustiveness check.
//
// Ids differ between shells where the copy differs -- map ids, never labels:
//   - ActivityEditor's routing tab is id "connectors" here, "Routing" in Studio.
//   - GeneratorEditor's first tab is "settings" here, "Basic" in Studio; its
//     initial-state tab is "events" here, "States" in Studio.
// ModelEditor's first tab is "basic" in BOTH shells -- verified against this
// file's real TAB_CONFIG (ModelEditor.tsx), which does NOT use "settings".
//
// ModelEditor also carries a "validation" tab neither Studio's Model editor
// nor the surface catalog has any notion of. It is diagnostics, not an
// authoring-complexity concern, so it is deliberately left OUT of
// LUCID_MODEL_TAB_SURFACE and is never gated by view -- always shown.
//
// ResourceBlockEditor has no map of its own: it renders the SHARED
// ResourceEditor from quodsi_studio/platforms/shared directly, and that
// component already gates its own tabs with RESOURCE_TAB_SURFACE -- nothing
// to duplicate here.

import type { SurfaceId } from '@quodsi/shared'

type ActivityTabId = 'basic' | 'actions' | 'financial' | 'failure' | 'connectors' | 'levers'

export const LUCID_ACTIVITY_TAB_SURFACE: Record<ActivityTabId, SurfaceId> = {
  basic: 'activity.tab.basic',
  actions: 'activity.tab.actions',
  financial: 'activity.tab.financial',
  failure: 'activity.tab.failure',
  connectors: 'activity.tab.routing',
  levers: 'activity.tab.levers',
}

type GeneratorTabId = 'settings' | 'events' | 'routing' | 'levers'

export const LUCID_GENERATOR_TAB_SURFACE: Record<GeneratorTabId, SurfaceId> = {
  settings: 'generator.tab.basic',
  events: 'generator.tab.states',
  routing: 'generator.tab.routing',
  levers: 'generator.tab.levers',
}

type ModelTabId =
  | 'basic'
  | 'states'
  | 'entities'
  | 'resources'
  | 'requirements'
  | 'arrivals'
  | 'schedules'
  | 'levers'

export const LUCID_MODEL_TAB_SURFACE: Record<ModelTabId, SurfaceId> = {
  basic: 'model.tab.basic',
  states: 'model.tab.states',
  entities: 'model.tab.entities',
  resources: 'model.tab.resources',
  requirements: 'model.tab.requirements',
  arrivals: 'model.tab.arrivals',
  schedules: 'model.tab.schedules',
  levers: 'model.tab.levers',
}

// Task 13-equivalent, ported from quodsi_studio's ACTIVITY_EXTRA_SURFACES
// (see that file's header): ActivityEditor mounts the same shared
// CapacitySourcePicker Resource's own editor does, so it needs the same two
// option-level surfaces widening its ViewTell -- otherwise a Basic Activity
// following a work schedule shows "Follow a schedule" checked-and-disabled
// with no tell to explain it. Final-review fix, 2026-09-01.
export const LUCID_ACTIVITY_EXTRA_SURFACES: SurfaceId[] = [
  // Lucid's ActionEditor renders its own "State Condition Guard" rather
  // than the shared ActionCard, so this surface has to be listed (and
  // gated) here independently.
  'action.field.condition',
  'resource.capacity.fixed',
  'resource.capacity.schedule',
]

// Model-level FIELD surfaces, the counterpart to quodsi_studio's
// MODEL_EXTRA_SURFACES. Lucid's ModelEditor renders its own copies of these
// four controls (it does not mount the shared BasicSettingsTab), so it needs
// its own ViewGated wrappers AND its own tell list -- without this, gating
// them would hide live settings with nothing on screen to explain why.
export const LUCID_MODEL_EXTRA_SURFACES: SurfaceId[] = [
  'model.field.replications',
  'model.field.clockUnit',
  'model.field.timeMode',
  'model.field.warmup',
]
