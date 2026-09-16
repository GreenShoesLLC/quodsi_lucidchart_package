import { useEffect } from 'react';
import { getLogger } from '@quodsi/lucid-shared';

const logger = getLogger('InitializationEffects');

/**
 * Effect for detecting panel type from URL
 * 
 * Purpose:
 * - Determines the panel type (auth or model) based on URL parameters or path
 * - Initializes the app state with the correct panel type
 * - Ensures consistent app initialization even with different entry points
 * 
 * Trigger:
 * - When state.app.initialized is false (only runs during initial app setup)
 * 
 * Key Actions:
 * - Extracts panel type from URL search parameters (e.g., '?panel=auth')
 * - Falls back to checking URL path or initialPanelType prop
 * - Defaults to 'model' panel if no type can be determined
 * - Dispatches APP_INITIALIZE action with the detected panel type
 */
export function usePanelTypeDetectionEffect(
  state: { app: { initialized: boolean } },
  dispatch: React.Dispatch<any>,
  initialPanelType?: 'auth' | 'model' | 'results' | 'studio-embed' | 'pattern' | 'schedule' | 'work-schedule' | 'settings' | 'diagram-mapping'
) {
  useEffect(() => {
    if (!state.app.initialized) {
      // Try to determine panel type from URL search params
      const urlParams = new URLSearchParams(window.location.search);
      const panelParam = urlParams.get("panel");
      const viewParam = urlParams.get("view");

      let detectedType: "auth" | "model" | "results" | "studio-embed" | "pattern" | "schedule" | "work-schedule" | "settings" | "diagram-mapping" | undefined = initialPanelType;

      if (viewParam === "pattern") {
        detectedType = "pattern";
      } else if (viewParam === "schedule") {
        detectedType = "schedule";
      } else if (viewParam === "diagram-mapping") {
        // The inline Diagram Mapping modal (spec 2026-09-15, "opens
        // inline") -- same reasoning as work-schedule/settings below.
        detectedType = "diagram-mapping";
      } else if (viewParam === "work-schedule") {
        // The work-schedule editor modal. Listed explicitly rather than left
        // to the `initialPanelType` fallthrough: App already passes it, so
        // omitting this branch happens to work -- and would silently stop
        // working the day anything reorders the chain or reaches this hook
        // without the prop. The panel type it settles on IS the REACT_APP_READY
        // `panel` value, i.e. which channel the host marks ready.
        detectedType = "work-schedule";
      } else if (viewParam === "settings") {
        // The Settings modal (Complexity Views, Task 11b) -- same reasoning
        // as work-schedule above.
        detectedType = "settings";
      } else if (viewParam === "studies" || viewParam === "advisor") {
        // The compiled Studies / Advisor modals keep the studio-embed channel
        // role. App passes the same value as the prop; listed explicitly for
        // the reason given under work-schedule.
        detectedType = "studio-embed";
      } else if (viewParam === "results") {
        // Modal mode: view=results takes precedence
        detectedType = "results";
      } else if (panelParam) {
        // If panel parameter exists, use it
        if (panelParam.toLowerCase() === "auth") {
          detectedType = "auth";
        } else if (panelParam.toLowerCase() === "results") {
          detectedType = "results";
        } else {
          detectedType = "model";
        }
      } else if (window.location.pathname.includes("auth")) {
        // Fallback to checking URL path
        detectedType = "auth";
      } else if (!detectedType) {
        // Default to model panel if we can't determine
        detectedType = "model";
      }

      logger.debug(`Detected panel type: ${detectedType}`);
      logger.debug(`Detected panel type: ${detectedType}`);
      dispatch({ type: "APP_INITIALIZE", panelType: detectedType });
    }
  }, [initialPanelType, state.app.initialized, dispatch]);
}
