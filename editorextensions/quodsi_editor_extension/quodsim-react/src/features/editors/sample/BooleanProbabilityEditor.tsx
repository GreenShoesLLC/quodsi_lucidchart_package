import React from "react";
import { Info } from "lucide-react";

interface Props {
  probability: number;
  onChange: (probability: number) => void;
}

/**
 * Editor component for BOOLEAN state sampling probability (Bernoulli distribution).
 * Sets the probability of the state being True.
 */
const BooleanProbabilityEditor: React.FC<Props> = ({
  probability,
  onChange,
}) => {
  const percentage = (probability * 100).toFixed(0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        <label className="text-xs font-medium text-gray-700">
          Probability of True
        </label>
        <span title="Set the probability that this boolean state will be True. The probability of False is automatically 1 - p.">
          <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
        </span>
      </div>

      {/* Slider with labels */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>0% (Always False)</span>
          <span>100% (Always True)</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={probability}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Value display and input */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={probability}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val >= 0 && val <= 1) {
                onChange(val);
              }
            }}
            className="w-20 px-2 py-1 text-sm border rounded text-center font-mono"
          />
          <span className="text-sm text-gray-600">({percentage}%)</span>
        </div>
      </div>

      {/* Visual representation */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-gray-600">True</span>
            <span className="font-mono">{percentage}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${probability * 100}%` }}
            />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-gray-600">False</span>
            <span className="font-mono">{(100 - parseFloat(percentage)).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-400 rounded-full transition-all"
              style={{ width: `${(1 - probability) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BooleanProbabilityEditor;
