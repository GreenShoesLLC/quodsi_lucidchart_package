// editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/SaveStatusLine.tsx
import React from "react";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import type { SaveStatus } from "./hooks/useEditorState";

interface Props {
  status: SaveStatus;
  lastSavedAt: number | null;
}

const SaveStatusLine: React.FC<Props> = ({ status }) => {
  // TODO(Phase 1): render `lastSavedAt` as "Saved Xs ago" when non-null.
  if (status === "saving") {
    return (
      <div role="status" className="flex items-center justify-end gap-1 pt-2 border-t text-xs text-gray-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Saving…</span>
      </div>
    );
  }
  if (status === "invalid") {
    return (
      <div role="status" className="flex items-center justify-end gap-1 pt-2 border-t text-xs text-yellow-600">
        <AlertTriangle className="w-3 h-3" />
        <span>Fix errors to save</span>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div role="status" className="flex items-center justify-end gap-1 pt-2 border-t text-xs text-red-600">
        <AlertTriangle className="w-3 h-3" />
        <span>Save failed — keep typing to retry</span>
      </div>
    );
  }
  // status === "saved"
  return (
    <div role="status" className="flex items-center justify-end gap-1 pt-2 border-t text-xs text-gray-400">
      <Check className="w-3 h-3" />
      <span>Saved</span>
    </div>
  );
};

export default SaveStatusLine;
