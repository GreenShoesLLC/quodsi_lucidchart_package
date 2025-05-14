import React, { useState } from "react";
import { useMessaging } from "../../messaging/MessageProvider";
import "./StateInspector.css";

type StateSection =
  | "auth"
  | "subscription"
  | "selection"
  | "simulation"
  | "app";

export const StateInspector: React.FC = () => {
  const state = useMessaging();
  const [activeSection, setActiveSection] = useState<StateSection>("auth");
  const [expanded, setExpanded] = useState(true);

  // Toggle expanded state
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Get the active state section
  const getActiveState = () => {
    switch (activeSection) {
      case "auth":
        return state.auth;
      case "subscription":
        return state.subscription;
      case "selection":
        return state.selection;
      case "simulation":
        return state.simulation;
      case "app":
        return state.app;
      default:
        return state.auth;
    }
  };

  return (
    <div className={`state-inspector ${expanded ? "expanded" : "collapsed"}`}>
      <div className="inspector-header">
        <h3>State Inspector</h3>
        <div className="inspector-controls">
          <button onClick={toggleExpanded}>
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <div className="inspector-tabs">
            <button
              className={activeSection === "auth" ? "active" : ""}
              onClick={() => setActiveSection("auth")}
            >
              Auth
            </button>
            <button
              className={activeSection === "subscription" ? "active" : ""}
              onClick={() => setActiveSection("subscription")}
            >
              Subscription
            </button>
            <button
              className={activeSection === "selection" ? "active" : ""}
              onClick={() => setActiveSection("selection")}
            >
              Selection
            </button>
            <button
              className={activeSection === "simulation" ? "active" : ""}
              onClick={() => setActiveSection("simulation")}
            >
              Simulation
            </button>
            <button
              className={activeSection === "app" ? "active" : ""}
              onClick={() => setActiveSection("app")}
            >
              App
            </button>
          </div>

          <div className="state-content">
            <div className="state-header">
              <h4>{activeSection} State</h4>
              {activeSection === "auth" && state.auth.lastUpdated && (
                <span className="timestamp">
                  Updated:{" "}
                  {new Date(state.auth.lastUpdated).toLocaleTimeString()}
                </span>
              )}
              {activeSection === "subscription" &&
                state.subscription.lastUpdated && (
                  <span className="timestamp">
                    Updated:{" "}
                    {new Date(
                      state.subscription.lastUpdated
                    ).toLocaleTimeString()}
                  </span>
                )}
              {activeSection === "selection" && state.selection.lastUpdated && (
                <span className="timestamp">
                  Updated:{" "}
                  {new Date(state.selection.lastUpdated).toLocaleTimeString()}
                </span>
              )}
              {activeSection === "simulation" &&
                state.simulation.lastUpdated && (
                  <span className="timestamp">
                    Updated:{" "}
                    {new Date(
                      state.simulation.lastUpdated
                    ).toLocaleTimeString()}
                  </span>
                )}
            </div>

            <pre>{JSON.stringify(getActiveState(), null, 2)}</pre>
          </div>
        </>
      )}
    </div>
  );
};

export default StateInspector;
