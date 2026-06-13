import React from 'react';
import {
  ScenarioObjectType, ScenarioPropertyName, NUMERIC_PROPERTIES_BY_OBJECT_TYPE,
  PROPERTY_DISPLAY_LABELS, isRateScaleProperty, type ScenarioLever,
} from '@quodsi/lucid-shared';
import { leverFor, toggleLever, patchLever, patchRange } from './leverEditing';

const RATE_SCALABLE = new Set(['constant', 'uniform', 'triangular', 'normal', 'exponential', 'gamma', 'lognormal']);

interface Props {
  objectType: ScenarioObjectType;
  componentName: string;
  levers: ScenarioLever[];
  onChange: (next: ScenarioLever[]) => void;
  currentDistributionType?: string; // for the rate-scalability warning (Generator only)
}

export function LeverAuthoringSection({ objectType, componentName, levers, onChange, currentDistributionType }: Props) {
  const eligible = [
    ...(NUMERIC_PROPERTIES_BY_OBJECT_TYPE[objectType] ?? []),
    ...(objectType === ScenarioObjectType.GENERATOR ? [ScenarioPropertyName.INTERARRIVAL_TIMING] : []),
  ];
  if (eligible.length === 0) return null;

  return (
    <div className="pt-3 border-t" data-testid="lever-authoring">
      <div className="text-sm font-medium mb-1">Scenario levers</div>
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
    </div>
  );
}
