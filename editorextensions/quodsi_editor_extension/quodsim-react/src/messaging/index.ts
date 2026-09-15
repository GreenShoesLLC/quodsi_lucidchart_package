// This barrel exists for one consumer (`features/LucidApp.tsx`'s
// `import { useMessaging } from "../messaging"`) -- everything else in the
// messaging system is imported by direct file path. Only re-export a name
// here once something actually imports it through this path.
export { useMessaging } from './MessageProvider';
