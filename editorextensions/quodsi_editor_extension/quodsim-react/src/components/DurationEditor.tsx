import React from "react";
import { DurationType, PeriodUnit, Duration } from "@quodsi/shared";

interface Props {
  duration: Duration;
  onChange: (updatedDuration: Duration) => void;
  lengthLabel?: string;
  periodUnitLabel?: string;
  durationTypeLabel?: string;
}

const DurationEditor: React.FC<Props> = ({
  duration,
  onChange,
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
    <div className="quodsi-field">
      <div className="quodsi-field">
        <label htmlFor="durationLength" className="quodsi-label">
          {lengthLabel}
        </label>
        <input
          type="number"
          id="durationLength"
          name="durationLength"
          className="quodsi-input"
          value={duration.durationLength}
          onChange={handleChange}
          min="0"
        />
      </div>

      <div className="quodsi-field">
        <label htmlFor="durationPeriodUnit" className="quodsi-label">
          {periodUnitLabel}
        </label>
        <select
          id="durationPeriodUnit"
          name="durationPeriodUnit"
          className="quodsi-select"
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

      <div className="quodsi-field">
        <label htmlFor="durationType" className="quodsi-label">
          {durationTypeLabel}
        </label>
        <select
          id="durationType"
          name="durationType"
          className="quodsi-select"
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