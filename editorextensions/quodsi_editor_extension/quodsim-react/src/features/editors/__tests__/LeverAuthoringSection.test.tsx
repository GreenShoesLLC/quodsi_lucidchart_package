import { render, screen, fireEvent } from '@testing-library/react';
import { LeverAuthoringSection } from '../LeverAuthoringSection';
import { ScenarioObjectType, ScenarioPropertyName, type ScenarioLever } from '@quodsi/lucid-shared';

it('checking an eligible property adds an enabled lever with a "Component — Property" default label + a default range', () => {
  const onChange = jest.fn();
  render(<LeverAuthoringSection objectType={ScenarioObjectType.RESOURCE} componentName="Nurse" levers={[]} onChange={onChange} />);
  fireEvent.click(screen.getByLabelText(/use Capacity as a scenario lever/i));
  const next: ScenarioLever[] = onChange.mock.calls.at(-1)![0];
  expect(next).toHaveLength(1);
  expect(next[0]).toMatchObject({ propertyName: ScenarioPropertyName.CAPACITY, label: 'Nurse — Capacity', enabled: true });
  expect(next[0].range).toEqual({ min: 1, max: 5, step: 1 });
  expect(next[0].leverId).toBeTruthy();
});

it('unchecking removes the lever; editing label/range patches it', () => {
  const lever: ScenarioLever = { leverId: 'lv1', propertyName: ScenarioPropertyName.CAPACITY, enabled: true, label: 'Nurses', range: { min: 7, max: 9, step: 1 } };
  const onChange = jest.fn();
  const { rerender } = render(<LeverAuthoringSection objectType={ScenarioObjectType.RESOURCE} componentName="Nurse" levers={[lever]} onChange={onChange} />);
  // label shows the existing range + label
  expect(screen.getByLabelText(/lever label/i)).toHaveValue('Nurses');
  fireEvent.change(screen.getByLabelText(/^max$/i), { target: { value: '12' } });
  expect(onChange.mock.calls.at(-1)![0][0].range).toEqual({ min: 7, max: 12, step: 1 });
  // unchecking removes
  fireEvent.click(screen.getByLabelText(/use Capacity as a scenario lever/i));
  expect(onChange.mock.calls.at(-1)![0]).toEqual([]);
  rerender(<LeverAuthoringSection objectType={ScenarioObjectType.RESOURCE} componentName="Nurse" levers={[]} onChange={onChange} />);
});

it('renders nothing for an object type with no rangeable properties', () => {
  const { container } = render(<LeverAuthoringSection objectType={ScenarioObjectType.ENTITY} componentName="Patient" levers={[]} onChange={jest.fn()} />);
  expect(container).toBeEmptyDOMElement();
});
