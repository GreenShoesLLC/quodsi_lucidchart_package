import React, { useEffect, useState } from "react";
import { EnvelopeMessageType, type EnvelopeBase, type MenuCommandData } from "@quodsi/lucid-shared";
import { useMessaging } from "../../messaging";
import { useModelOpsSender } from "../../messaging/senders/modelOpsSender";
import { useSimulationRunSender } from "../../messaging/senders/simulationRunSender";
import { RemoveModelModal } from "../shared/RemoveModelModal";

/**
 * Carries out the extension "Quodsi" menu's panel items (MENU_COMMAND, see
 * src/core/quodsiMenu.ts): the Remove confirmation, and Diagram Mapping, which opens through the panel so it gets the window-size
 * preference and the pending-edit flush. Mounted by LucidApp outside
 * ModelPanel, so it hears a command on every page state, including an
 * unconverted page, and survives ModelPanel's per-document remount.
 */
export const MenuCommandHost: React.FC = () => {
  const { selection } = useMessaging();
  const { removeModel } = useModelOpsSender();
  const { openDiagramMappingModal } = useSimulationRunSender();
  const [removeOpen, setRemoveOpen] = useState(false);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const msg = event.data as EnvelopeBase | undefined;
      if (msg?.type !== EnvelopeMessageType.MENU_COMMAND) return;
      const { command } = (msg.data ?? {}) as Partial<MenuCommandData>;
      if (command === "remove-model") setRemoveOpen(true);
      else if (command === "diagram-mapping") openDiagramMappingModal();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [openDiagramMappingModal]);

  return (
    <RemoveModelModal
      isOpen={removeOpen}
      onClose={() => setRemoveOpen(false)}
      onConfirm={() => {
        setRemoveOpen(false);
        removeModel(selection.documentContext?.documentId ?? "");
      }}
    />
  );
};
