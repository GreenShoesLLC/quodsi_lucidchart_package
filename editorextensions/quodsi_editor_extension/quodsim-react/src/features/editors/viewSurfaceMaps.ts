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
//
// The Model editor has no map here: Lucid renders Studio's shared ModelEditor
// (spec 2026-09-13), which gates its own tabs and fields with
// MODEL_TAB_SURFACE / MODEL_EXTRA_SURFACES. Nor does the Generator editor:
// Lucid renders Studio's shared GeneratorEditor (spec 2026-09-14), gated by
// GENERATOR_TAB_SURFACE / GENERATOR_EXTRA_SURFACES.
//
// ResourceBlockEditor has no map of its own: it renders the SHARED
// ResourceEditor from quodsi_studio/platforms/shared directly, and that
// component already gates its own tabs with RESOURCE_TAB_SURFACE -- nothing
// to duplicate here. Likewise ElementEditor's Connector case renders the
// shared ConnectorEditor (2026-09-03), whose Routing | Levers tabs are gated
// by CONNECTOR_TAB_SURFACE in that file.

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
