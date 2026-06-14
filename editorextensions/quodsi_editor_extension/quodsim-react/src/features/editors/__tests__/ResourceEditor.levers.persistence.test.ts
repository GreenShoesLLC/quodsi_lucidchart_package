import { extractResourceDataPure } from '../ResourceEditor';

it('extractResourceData preserves levers', () => {
  const resource = {
    id: 'r1',
    name: 'Nurse',
    capacity: 3,
    levers: [{ leverId: 'lv1', propertyName: 'CAPACITY', enabled: true, label: 'Nurses', range: { min: 7, max: 9, step: 1 } }],
  } as any;
  expect(extractResourceDataPure(resource).levers).toEqual(resource.levers);
});

it('extractResourceData defaults levers to [] when absent', () => {
  const resource = { id: 'r2', name: 'Doctor', capacity: 1 } as any;
  expect(extractResourceDataPure(resource).levers).toEqual([]);
});
