import { render, screen, fireEvent } from '@testing-library/react';
import { LeverAuthoringSection } from '../LeverAuthoringSection';
import { ScenarioObjectType, ScenarioPropertyName } from '@quodsi/lucid-shared';

const seizeActions = [{ id: 'act-7', label: 'Seize (1)' }];

it('renders a range error when a SEIZE_PRIORITY lever exceeds the property bound', () => {
  const levers = [{
    leverId: 'l1', propertyName: ScenarioPropertyName.SEIZE_PRIORITY, actionId: 'act-7',
    enabled: true, label: 'Priority', range: { min: 0, max: 5000, step: 1 },
  }];
  render(<LeverAuthoringSection objectType={ScenarioObjectType.ACTIVITY} componentName="Triage" levers={levers as any} onChange={() => {}} seizeActions={seizeActions} />);
  fireEvent.click(screen.getByRole('button', { name: /scenario levers/i }));
  expect(screen.getByText(/between 0 and 900/)).toBeInTheDocument();
});

it('renders no range error when a SEIZE_PRIORITY lever is within bounds', () => {
  const levers = [{
    leverId: 'l1', propertyName: ScenarioPropertyName.SEIZE_PRIORITY, actionId: 'act-7',
    enabled: true, label: 'Priority', range: { min: 0, max: 10, step: 1 },
  }];
  render(<LeverAuthoringSection objectType={ScenarioObjectType.ACTIVITY} componentName="Triage" levers={levers as any} onChange={() => {}} seizeActions={seizeActions} />);
  fireEvent.click(screen.getByRole('button', { name: /scenario levers/i }));
  expect(screen.queryByText(/between 0 and 900/)).not.toBeInTheDocument();
});
