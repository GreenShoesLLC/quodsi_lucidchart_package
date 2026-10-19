/**
 * Onboarding tour messages (spec 2026-10-16, Lucid onboarding tour): the
 * panel asks the extension to build the example page, select a shape by its
 * Quodsi name, and switch back to the example page; the extension menu starts
 * the tour.
 */

/** Panel -> host TOUR_LOAD_EXAMPLE. `replace` deletes an existing example page first. */
export type TourLoadExampleData = { replace: boolean };

/** Host -> panel reply to TOUR_LOAD_EXAMPLE, sent with the request's envelope id. */
export type TourLoadExampleResultData =
  | { outcome: 'loaded'; pageId: string }
  | { outcome: 'occupied' }
  | { outcome: 'failed'; error: string };

/** Panel -> host TOUR_SELECT_SHAPE. `null` clears the selection. No reply. */
export type TourSelectShapeData = { name: string | null };

/** Host -> panel reply to TOUR_SHOW_EXAMPLE_PAGE, sent with the request's envelope id. */
export type TourShowExamplePageResultData =
  | { outcome: 'shown'; pageId: string }
  | { outcome: 'missing' };

/** Host -> panel TOUR_START. `reset` restarts from the beginning. */
export type TourStartData = { reset: boolean };
