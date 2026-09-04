import React from "react";
import { Sparkles } from "lucide-react";
import { useSimulationRunSender, type AdvisorLaunchFocus } from "../../messaging/senders/simulationRunSender";
import { useAuth } from "../../messaging/MessageContext";

/**
 * The Lucid entry point to the AI Advisor. Lucid's panel cannot host the
 * consult itself (no network access, and performDataAction cannot stream),
 * so the click asks the host to open the embedded-Studio /embed/advisor route
 * in a StudioEmbedModal with this focus on the query string. Read-only in
 * this piece: the embedded consult has no apply.
 *
 * Rendered by PanelHeader, which gates it behind the `quodsi_devtools`
 * localStorage flag (the Advisor ships dark, matching drawio's ?qdev=1) --
 * so this component itself does NOT check the flag.
 *
 * Exported for unit testing.
 */
export function AdvisorLaunchButton({ focus }: { focus: AdvisorLaunchFocus }) {
  const { openAdvisorModal } = useSimulationRunSender();
  const auth = useAuth();
  const title = !auth.isAuthenticated ? "Sign in to use the Advisor" : "Ask the Advisor about this";

  return (
    <button
      type="button"
      data-testid="open-advisor-modal"
      aria-label="Ask the Advisor about this"
      title={title}
      disabled={!auth.isAuthenticated}
      onClick={() => openAdvisorModal(focus)}
      className="p-1 rounded text-gray-500 hover:text-blue-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Sparkles className="w-4 h-4" />
    </button>
  );
}

const CONSULTABLE_TYPES = new Set<AdvisorLaunchFocus["focusType"]>([
  "Activity", "Resource", "Generator", "Entity", "Connector",
]);

/** The model-as-a-whole focus. Blank model name -> no name (Studio shows "Model"). */
export function modelAdvisorFocus(modelName: string): AdvisorLaunchFocus {
  return { focusId: "", focusType: "Model", focusName: modelName || undefined, mode: "definition" };
}

/**
 * Focus for the element header. A consultable element type keeps its shape
 * id (which IS the element id in Lucid -- ModelLucid sets id to the platform
 * element id -- so the server's focus pinning finds it in the relayed
 * document). Anything else (None, Model, unknown) is the model focus.
 */
export function advisorFocusForElement(
  elementType: string,
  elementId: string,
  elementName: string,
): AdvisorLaunchFocus {
  if (CONSULTABLE_TYPES.has(elementType as AdvisorLaunchFocus["focusType"])) {
    return {
      focusId: elementId,
      focusType: elementType as AdvisorLaunchFocus["focusType"],
      focusName: elementName,
      mode: "definition",
    };
  }
  return modelAdvisorFocus(elementType === "Model" ? elementName : "");
}
