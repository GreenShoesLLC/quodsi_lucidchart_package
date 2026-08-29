import { render, screen, fireEvent } from '@testing-library/react';
import { LeverAuthoringSection } from '../LeverAuthoringSection';
import { ScenarioObjectType, ScenarioPropertyName } from '@quodsi/lucid-shared';

const seizeActions = [{ id: 'act-7', label: 'Seize (1)' }];

it('renders a priority-lever row per seize action and authors a SEIZE_PRIORITY lever', () => {
  const onChange = vi.fn();
  render(<LeverAuthoringSection objectType={ScenarioObjectType.ACTIVITY} componentName="Triage" levers={[]} onChange={onChange} seizeActions={seizeActions} />);
  fireEvent.click(screen.getByRole('button', { name: /scenario levers/i }));
  const cb = screen.getByLabelText(/Use Seize \(1\) as a scenario lever/i);
  fireEvent.click(cb);
  const next = onChange.mock.calls[0][0];
  expect(next[0]).toMatchObject({ propertyName: ScenarioPropertyName.SEIZE_PRIORITY, actionId: 'act-7', range: { min: 0, max: 10, step: 1 } });
});

it('editing the max input calls onChange with the priority lever range max updated', () => {
  const onChange = vi.fn();
  const levers = [{ leverId: 'l1', propertyName: ScenarioPropertyName.SEIZE_PRIORITY, actionId: 'act-7', enabled: true, label: 'Priority', range: { min: 0, max: 10, step: 1 } }];
  render(<LeverAuthoringSection objectType={ScenarioObjectType.ACTIVITY} componentName="Triage" levers={levers as any} onChange={onChange} seizeActions={seizeActions} />);
  fireEvent.click(screen.getByRole('button', { name: /scenario levers/i }));
  const maxInput = screen.getByLabelText('max');
  fireEvent.change(maxInput, { target: { value: '900' } });
  const next = onChange.mock.calls[0][0];
  expect(next[0].range.max).toBe(900);
});
