import React from 'react';
import { Duration } from '../app/models/duration';
import { PeriodUnit } from '../app/models/enums/PeriodUnit';
import { DurationType } from '../app/models/enums/DurationType';

interface Props {
  duration: Duration;
  onChange: (updatedDuration: Duration) => void;
}

const DurationEditor: React.FC<Props> = ({ duration, onChange }) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    let updatedValue: any = value;

    if (name === 'durationLength') {
      updatedValue = parseFloat(value);
    } else if (name === 'durationPeriodUnit' || name === 'durationType') {
      updatedValue = value as PeriodUnit | DurationType;
    }

    const updatedDuration = {
      ...duration,
      [name]: updatedValue
    };
    onChange(updatedDuration);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <label htmlFor="durationLength">Duration Length:</label>
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

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <label htmlFor="durationPeriodUnit">Duration Period Unit:</label>
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

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <label htmlFor="durationType">Duration Type:</label>
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