import React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  ScenarioObjectType, ScenarioPropertyName, NUMERIC_PROPERTIES_BY_OBJECT_TYPE,
  PROPERTY_DISPLAY_LABELS, isRateScaleProperty, type ScenarioLever,
} from '@quodsi/lucid-shared';
import { leverFor, toggleLever, patchLever, patchRange, leverForAction, toggleActionLever, patchActionLever, patchActionRange } from './leverEditing';

const RATE_SCALABLE = new Set(['constant', 'uniform', 'triangular', 'normal', 'exponential', 'gamma', 'lognormal']);

interface ActionLeverTarget { id: string; label: string; distributionType?: string; }
interface Props {
  objectType: ScenarioObjectType;
  componentName: string;
  levers: ScenarioLever[];
  onChange: (next: ScenarioLever[]) => void;
  currentDistributionType?: string;          // generator rate-scalability warning
  actions?: ActionLeverTarget[];             // activity duration-bearing actions
}

export function LeverAuthoringSection({ objectType, componentName, levers, onChange, currentDistributionType, actions }: Props) {
  const [expanded, setExpanded] = React.useState(false);
  const enabledCount = (levers ?? []).filter((l) => l.enabled !== false).length;

  const eligible = [
    ...(NUMERIC_PROPERTIES_BY_OBJECT_TYPE[objectType] ?? []),
    ...(objectType === ScenarioObjectType.GENERATOR ? [ScenarioPropertyName.INTERARRIVAL_TIMING] : []),
  ];
  if (eligible.length === 0 && (!actions || actions.length === 0)) return null;

  return (
    <div className="pt-3 border-t" data-testid="lever-authoring">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex items-center gap-1 w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? '' : '-rotate-90'}`} />
        <span>Scenario levers</span>
        {enabledCount > 0 && (
          <span className="ml-1 text-xs font-normal bg-blue-100 text-blue-700 rounded-full px-2 py-0.5" data-testid="lever-count">
            {enabledCount}
          </span>
        )}
      </button>
      {expanded && (
        <div className="mt-2">
      {eligible.map((pn: ScenarioPropertyName) => {
        const lever = leverFor(levers, pn);
        const isRate = isRateScaleProperty(objectType, pn);
        return (
          <div key={pn} className="mb-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!lever}
                aria-label={`Use ${PROPERTY_DISPLAY_LABELS[pn]} as a scenario lever`}
                onChange={() => onChange(toggleLever(levers, pn, componentName))}
              />
              <span>{PROPERTY_DISPLAY_LABELS[pn]}</span>
            </label>
            {lever && (
              <div className="pl-6 mt-1 space-y-1">
                <input
                  type="text" aria-label="Lever label" placeholder="Label"
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={lever.label}
                  onChange={(e) => onChange(patchLever(levers, pn, { label: e.target.value }))}
                />
                <div className="text-xs text-gray-500">
                  {isRate ? 'Rate multiplier sweep (×2 = double the arrivals; ×1 = unchanged)' : 'Value range to sweep'}
                </div>
                <div className="flex gap-2">
                  {(['min', 'max', 'step'] as const).map((k) => (
                    <label key={k} className="flex flex-col text-xs">
                      {k}
                      <input
                        type="number" aria-label={k} step={isRate ? 0.1 : undefined}
                        className="border rounded px-2 py-1 text-sm w-16"
                        value={lever.range?.[k] ?? ''}
                        onChange={(e) => onChange(patchRange(levers, pn, k, parseFloat(e.target.value)))}
                      />
                    </label>
                  ))}
                </div>
                {isRate && currentDistributionType && !RATE_SCALABLE.has(currentDistributionType.toLowerCase()) && (
                  <div className="text-xs text-amber-600 mt-1">
                    This generator's “{currentDistributionType}” distribution can't be rate-scaled — these runs won't change. Use a swappable distribution (e.g. exponential) or a distribution-swap change.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {objectType === ScenarioObjectType.ACTIVITY && actions && actions.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-medium text-gray-600 mb-1">Action durations</div>
          {actions.map((a) => {
            const lever = leverForAction(levers, a.id);
            const notScalable = !!a.distributionType && !RATE_SCALABLE.has(a.distributionType.toLowerCase());
            return (
              <div key={a.id} className="mb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!lever}
                    aria-label={`Use ${a.label} duration as a scenario lever`}
                    onChange={() => onChange(toggleActionLever(levers, a.id, a.label))}
                  />
                  <span>{a.label}</span>
                </label>
                {lever && (
                  <div className="pl-6 mt-1 space-y-1">
                    <input
                      type="text" aria-label="Lever label" placeholder="Label"
                      className="border rounded px-2 py-1 text-sm w-full"
                      value={lever.label}
                      onChange={(e) => onChange(patchActionLever(levers, a.id, { label: e.target.value }))}
                    />
                    <div className="text-xs text-gray-500">Service-rate multiplier sweep (×2 = twice as fast; ×1 = unchanged)</div>
                    <div className="flex gap-2">
                      {(['min', 'max', 'step'] as const).map((k) => (
                        <label key={k} className="flex flex-col text-xs">
                          {k}
                          <input
                            type="number" aria-label={k} step={0.1}
                            className="border rounded px-2 py-1 text-sm w-16"
                            value={lever.range?.[k] ?? ''}
                            onChange={(e) => onChange(patchActionRange(levers, a.id, k, parseFloat(e.target.value)))}
                          />
                        </label>
                      ))}
                    </div>
                    {notScalable && (
                      <div className="text-xs text-amber-600 mt-1">
                        This action's "{a.distributionType}" distribution can't be rate-scaled — these runs won't change. Use a swappable distribution (e.g. exponential).
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </div>
      )}
    </div>
  );
}
