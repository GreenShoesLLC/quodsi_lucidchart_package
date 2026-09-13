// quodsim-react/src/features/editors/LucidStateModificationsEditor.tsx
//
// Lucid host for the shared StateModificationsEditor (spec 2026-09-13
// lucid-state-modifications-editor §1). Lucid's editors title each
// state-modification section and hold states in a StateListManager; the shared
// editor takes a plain State[] and a States-tab link hook. This wrapper is the
// one place those differences are bridged, for all five mounts (ActionEditor's
// Assign, Split, Create and Join; GeneratorEditor's initial states).

import React, { useMemo } from "react";
import type { StateListManager, StateModification } from "@quodsi/lucid-shared";
import { StateModificationsEditor } from "quodsi_studio/platforms/shared";

export interface LucidStateModificationsEditorProps {
  title: string;
  description?: string;
  modifications: StateModification[];
  onModificationsChange: (modifications: StateModification[]) => void;
  states: StateListManager;
  allowCrossComponent?: boolean;
  onNavigateToModelEditor?: () => void;
}

export function LucidStateModificationsEditor({
  title,
  description,
  modifications,
  onModificationsChange,
  states,
  allowCrossComponent = false,
  onNavigateToModelEditor,
}: LucidStateModificationsEditorProps) {
  const stateList = useMemo(() => states.getAll(), [states]);

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium">{title}</div>
      <StateModificationsEditor
        modifications={modifications}
        states={stateList}
        onModificationsChange={onModificationsChange}
        allowCrossComponent={allowCrossComponent}
        description={description}
        onGoToStates={onNavigateToModelEditor}
      />
    </div>
  );
}
