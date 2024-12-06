import React from "react";
import { DurationType } from "@quodsi/shared";
import { PeriodUnit } from "@quodsi/shared";
import { Duration } from "@quodsi/shared";

interface Props {
  duration: Duration;
  onChange: (updatedDuration: Duration) => void;
  // Add optional label props with defaults
  lengthLabel?: string;
  periodUnitLabel?: string;
  durationTypeLabel?: string;
}

const DurationEditor: React.FC<Props> = ({
  duration,
  onChange,
  // Default labels if not provided
  lengthLabel = "Duration Length",
  periodUnitLabel = "Duration Period Unit",
  durationTypeLabel = "Duration Type",
}) => {
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    let updatedValue: any = value;

    if (name === "durationLength") {
      updatedValue = parseFloat(value);
    } else if (name === "durationPeriodUnit" || name === "durationType") {
      updatedValue = value as PeriodUnit | DurationType;
    }

    const updatedDuration = {
      ...duration,
      [name]: updatedValue,
    };
    onChange(updatedDuration);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label htmlFor="durationLength">{lengthLabel}:</label>
        <input
          type="number"
          id="durationLength"
          name="durationLength"
          className="lucid-styling"
          value={duration.durationLength}
          onChange={handleChange}
          min="0"
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label htmlFor="durationPeriodUnit">{periodUnitLabel}:</label>
        <select
          id="durationPeriodUnit"
          name="durationPeriodUnit"
          className="lucid-styling"
          value={duration.durationPeriodUnit}
          onChange={handleChange}
        >
          {Object.keys(PeriodUnit).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label htmlFor="durationType">{durationTypeLabel}:</label>
        <select
          id="durationType"
          name="durationType"
          className="lucid-styling"
          value={duration.durationType}
          onChange={handleChange}
        >
          {Object.keys(DurationType).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default DurationEditor;
