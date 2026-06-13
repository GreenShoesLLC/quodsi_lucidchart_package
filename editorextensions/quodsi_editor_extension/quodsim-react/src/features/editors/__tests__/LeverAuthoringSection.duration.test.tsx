import { render, screen, fireEvent } from '@testing-library/react';
import { LeverAuthoringSection } from '../LeverAuthoringSection';
import { ScenarioObjectType, ScenarioPropertyName, type ScenarioLever } from '@quodsi/lucid-shared';

it('offers Inter-arrival Timing for a Generator and authors a rate-multiplier lever', () => {
  const onChange = jest.fn();
  render(<LeverAuthoringSection objectType={ScenarioObjectType.GENERATOR} componentName="Start" levers={[]} onChange={onChange} />);
  // the inter-arrival property appears as an eligible lever
  fireEvent.click(screen.getByLabelText(/use Inter-arrival Timing as a scenario lever/i));
  const next: ScenarioLever[] = onChange.mock.calls.at(-1)![0];
  expect(next[0]).toMatchObject({ propertyName: ScenarioPropertyName.INTERARRIVAL_TIMING, enabled: true });
  expect(next[0].range).toEqual({ min: 1, max: 5, step: 1 });
});

it('labels the inter-arrival range as a rate multiplier', () => {
  const lever: ScenarioLever = { leverId: 'lv1', propertyName: ScenarioPropertyName.INTERARRIVAL_TIMING, enabled: true, label: 'Arrival rate', range: { min: 1, max: 4, step: 1 } };
  render(<LeverAuthoringSection objectType={ScenarioObjectType.GENERATOR} componentName="Start" levers={[lever]} onChange={jest.fn()} />);
  expect(screen.getByText(/rate multiplier/i)).toBeInTheDocument();
});

it('does not offer Inter-arrival Timing for a Resource', () => {
  render(<LeverAuthoringSection objectType={ScenarioObjectType.RESOURCE} componentName="Nurse" levers={[]} onChange={jest.fn()} />);
  expect(screen.queryByLabelText(/inter-arrival/i)).toBeNull();
});
