import { render, screen, fireEvent } from '@testing-library/react';
import { LeverAuthoringSection } from '../LeverAuthoringSection';
import { ScenarioObjectType, ScenarioPropertyName } from '@quodsi/lucid-shared';

const actions = [{ id: 'act-7', label: 'Process (1)', distributionType: 'exponential' }];

it('renders a duration-lever row per action and authors a DURATION lever', () => {
  const onChange = jest.fn();
  render(<LeverAuthoringSection objectType={ScenarioObjectType.ACTIVITY} componentName="Triage" levers={[]} onChange={onChange} actions={actions} />);
  const cb = screen.getByLabelText(/Use Process \(1\) duration as a scenario lever/i);
  fireEvent.click(cb);
  const next = onChange.mock.calls[0][0];
  expect(next[0]).toMatchObject({ propertyName: ScenarioPropertyName.DURATION, actionId: 'act-7' });
});

it('warns when the action distribution is not rate-scalable', () => {
  const levers = [{ leverId: 'l1', propertyName: ScenarioPropertyName.DURATION, actionId: 'act-9', enabled: true, label: 'x', range: { min: 1, max: 3, step: 1 } }];
  render(<LeverAuthoringSection objectType={ScenarioObjectType.ACTIVITY} componentName="Triage" levers={levers as any} onChange={() => {}}
    actions={[{ id: 'act-9', label: 'Delay (1)', distributionType: 'beta' }]} />);
  expect(screen.getByText(/can't be rate-scaled/i)).toBeInTheDocument();
});
