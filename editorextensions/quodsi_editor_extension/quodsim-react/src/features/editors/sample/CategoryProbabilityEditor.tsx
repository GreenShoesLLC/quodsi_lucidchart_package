import React, { useMemo } from "react";
import { Info, RefreshCw } from "lucide-react";

interface Props {
  categoryValues: string[];
  probabilities: Record<string, number>;
  onChange: (probabilities: Record<string, number>) => void;
}

/**
 * Editor component for CATEGORY state sampling probabilities.
 * Allows setting probability for each category value with sum-to-1.0 validation.
 */
const CategoryProbabilityEditor: React.FC<Props> = ({
  categoryValues,
  probabilities,
  onChange,
}) => {
  // Calculate the sum of all probabilities
  const probabilitySum = useMemo(() => {
    return Object.values(probabilities).reduce((sum, p) => sum + (p || 0), 0);
  }, [probabilities]);

  // Check if sum is valid (within tolerance)
  const isValidSum = Math.abs(probabilitySum - 1.0) < 1e-6;

  // Handle individual probability change
  const handleProbabilityChange = (category: string, value: number) => {
    const newProbabilities = { ...probabilities, [category]: value };
    onChange(newProbabilities);
  };

  // Normalize probabilities to sum to 1.0
  const handleNormalize = () => {
    if (probabilitySum === 0) {
      // If all zeros, distribute equally
      const equalProb = 1.0 / categoryValues.length;
      const newProbabilities: Record<string, number> = {};
      categoryValues.forEach((cat) => {
        newProbabilities[cat] = equalProb;
      });
      onChange(newProbabilities);
    } else {
      // Scale all probabilities proportionally
      const scale = 1.0 / probabilitySum;
      const newProbabilities: Record<string, number> = {};
      categoryValues.forEach((cat) => {
        newProbabilities[cat] = (probabilities[cat] || 0) * scale;
      });
      onChange(newProbabilities);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <label className="text-xs font-medium text-gray-700">
            Category Probabilities
          </label>
          <span title="Set the probability for each category value. Probabilities must sum to 1.0 (100%).">
            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
          </span>
        </div>
        <button
          type="button"
          onClick={handleNormalize}
          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
          title="Normalize probabilities to sum to 1.0"
        >
          <RefreshCw className="w-3 h-3" />
          Normalize
        </button>
      </div>

      {/* Category probability inputs */}
      <div className="space-y-2">
        {categoryValues.map((category) => {
          const prob = probabilities[category] || 0;
          const percentage = (prob * 100).toFixed(1);

          return (
            <div key={category} className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600 w-20 truncate" title={category}>
                {category}
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={prob}
                onChange={(e) => handleProbabilityChange(category, parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={prob}
                onChange={(e) => handleProbabilityChange(category, parseFloat(e.target.value) || 0)}
                className="w-16 px-1.5 py-0.5 text-xs border rounded text-right font-mono"
              />
              <span className="text-xs text-gray-500 w-12 text-right">
                {percentage}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Sum indicator */}
      <div
        className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${
          isValidSum
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}
      >
        <span>Total:</span>
        <span className="font-mono font-medium">
          {(probabilitySum * 100).toFixed(1)}%
          {isValidSum ? " ✓" : " (must equal 100%)"}
        </span>
      </div>
    </div>
  );
};

export default CategoryProbabilityEditor;
