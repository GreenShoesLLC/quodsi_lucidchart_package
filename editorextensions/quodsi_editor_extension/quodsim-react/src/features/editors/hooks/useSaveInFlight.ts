// quodsim-react/src/features/editors/hooks/useSaveInFlight.ts
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A save-in-flight flag for an editor whose save is a PROMISE (the Model
 * editor's accessor.updateModel), shaped for useAutoSave's contract: every
 * tracked save shows `saving === true` for at least one render, then `false`
 * once every tracked save has settled -- the transition useAutoSave and
 * useSaveCompletionDetector wait for.
 *
 * WHY NOT A PLAIN useState. `setSaving(true)` followed by `setSaving(false)`
 * from a promise that settles before React renders (a fast host, any test
 * transport) batch into ONE render that never shows `true`. useAutoSave's
 * status then sticks at "saving" and its trailing save never fires. Here
 * `false` is only set once a render has committed `true`; a save that settled
 * earlier is closed by the effect that sees that commit.
 *
 * `track` never swallows a rejection for its caller -- the caller handles the
 * promise it passed in.
 */
export function useSaveInFlight(): { saving: boolean; track: (save: Promise<unknown>) => void } {
  const [saving, setSaving] = useState(false);
  const inFlightRef = useRef(0);
  const committedRef = useRef(false);

  useEffect(() => {
    committedRef.current = saving;
    if (saving && inFlightRef.current === 0) {
      setSaving(false);
    }
  }, [saving]);

  const track = useCallback((save: Promise<unknown>) => {
    inFlightRef.current += 1;
    setSaving(true);
    const settle = () => {
      inFlightRef.current -= 1;
      if (inFlightRef.current === 0 && committedRef.current) {
        setSaving(false);
      }
    };
    save.then(settle, settle);
  }, []);

  return { saving, track };
}
