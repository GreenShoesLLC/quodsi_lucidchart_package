// quodsim-react/src/features/onboarding/examplePageStore.ts
//
// Which Lucid document the tour belongs to, and the id of its example page,
// per user (spec 2026-10-16 C2/C4; final review ruling 7). The logic is the
// shared tourOwnership.ts (spec 2026-11-18 §5.1); Lucid keeps only its key,
// whose stored format the shared module reads unchanged.
import { createTourOwnership } from 'quodsi_studio/platforms/shared'

export type { TourOwner } from 'quodsi_studio/platforms/shared'

export const lucidOwnership = createTourOwnership('quodsi.onboarding.lucid.examplePage.v2')

export const EXAMPLE_PAGE_STORAGE_KEY = lucidOwnership.storageKey
export const {
  readTourOwner,
  adoptTourDocument,
  writeExamplePage,
  readExamplePageId,
  clearExamplePageId,
} = lucidOwnership
