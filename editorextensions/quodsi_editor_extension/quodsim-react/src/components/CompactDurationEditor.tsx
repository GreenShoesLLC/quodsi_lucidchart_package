import React from "react";
import { Duration, DurationType, PeriodUnit } from "@quodsi/shared";

interface CompactDurationEditorProps {
  duration: Duration;
  onChange: (updatedDuration: Duration) => void;
  lengthLabel: string; // Restored this prop
}

export const CompactDurationEditor: React.FC<CompactDurationEditorProps> = ({
  duration,
  onChange,
  lengthLabel,
}) => {
  const periodUnitDisplay: Record<PeriodUnit, string> = {
    [PeriodUnit.MINUTES]: "MIN",
    [PeriodUnit.HOURS]: "HR",
    [PeriodUnit.DAYS]: "DAY",
    [PeriodUnit.SECONDS]: "SEC",
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    const updatedDuration = {
      ...duration,
      [name]: name === "durationLength" ? parseFloat(value) : value,
      durationType: DurationType.CONSTANT,
    };
    onChange(updatedDuration);
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm">{lengthLabel}</span>
      <div className="flex items-center">
        <input
          type="number"
          name="durationLength"
          className="w-8 text-sm border rounded-l border-r-0"
          value={duration.durationLength}
          onChange={handleChange}
          min="0"
        />
        <select
          name="durationPeriodUnit"
          className="w-14 text-sm border rounded-r border-l-0"
          value={duration.durationPeriodUnit}
          onChange={handleChange}
        >
          {Object.values(PeriodUnit).map((unit) => (
            <option key={unit} value={unit}>
              {periodUnitDisplay[unit]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
