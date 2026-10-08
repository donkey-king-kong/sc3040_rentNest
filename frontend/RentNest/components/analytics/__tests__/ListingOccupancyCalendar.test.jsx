import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import ListingOccupancyCalendar from '../ListingOccupancyCalendar';
import { MetricDetails } from '../AnalyticsKit';

jest.mock('../../../config/api', () => ({ API_BASE_URL: 'http://test.local', ENDPOINTS: {} }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../MorphingInfinity', () => () => null);

const text = tree => tree.root.findAllByType(Text).map(node => [].concat(node.props.children)
  .filter(child => typeof child === 'string' || typeof child === 'number').join(''));
const action = (tree, label) => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
const press = async (tree, label) => {
  const button = action(tree, label);
  expect(button).toBeDefined();
  await act(async () => button.props.onPress());
};
const available = points => ({
  availability: 'available', basis: 'period', unit: 'status', points,
  definition: 'Occupied when an accepted tenancy overlaps any part of the month. Terminated tenancies end on their termination date.',
});
let trees;
const render = async series => {
  let tree;
  await act(async () => { tree = create(<ListingOccupancyCalendar series={series} />); });
  trees.push(tree);
  return tree;
};
beforeEach(() => { trees = []; });
afterEach(async () => { await act(async () => trees.forEach(tree => tree.unmount())); });

it('distinguishes months across years and explains partial-month occupancy without converting it to a percentage', async () => {
  const tree = await render(available([
    { bucket: '2025-12', value: 'vacant' },
    { bucket: '2026-01', value: 'occupied' },
    { bucket: '2026-12', value: 'occupied' },
  ]));
  expect(text(tree)).toEqual(expect.arrayContaining(['Monthly Occupancy', 'Dec 2025', 'Jan 2026', 'Dec 2026']));
  expect(text(tree)).toContain('Occupied means a tenancy overlapped at least part of the month.');
  expect(action(tree, 'December 2025: Vacant')).toBeDefined();
  expect(action(tree, 'December 2026: Occupied')).toBeDefined();
  await press(tree, 'January 2026: Occupied');
  expect(action(tree, 'January 2026: Occupied').props.accessibilityState.selected).toBe(true);
  expect(text(tree)).toEqual(expect.arrayContaining([
    'January 2026: Occupied', 'An accepted tenancy covered at least part of this month.',
  ]));
  expect(text(tree).some(value => value.includes('%'))).toBe(false);
});

it('switches the selected month and lets the user clear its details', async () => {
  const tree = await render(available([
    { bucket: '2026-01', value: 'occupied' }, { bucket: '2026-02', value: 'vacant' },
  ]));
  await press(tree, 'January 2026: Occupied');
  await press(tree, 'February 2026: Vacant');
  expect(action(tree, 'January 2026: Occupied').props.accessibilityState.selected).toBe(false);
  expect(action(tree, 'February 2026: Vacant').props.accessibilityState.selected).toBe(true);
  expect(text(tree)).toContain('No accepted tenancy overlapped this month.');
  expect(text(tree)).not.toContain('January 2026: Occupied');
  await press(tree, 'February 2026: Vacant');
  expect(action(tree, 'February 2026: Vacant').props.accessibilityState.selected).toBe(false);
  expect(text(tree)).toContain('Select a month for details.');
});

it.each([
  { bucket: '2026-03', value: null },
  { bucket: '2026-03', value: 'unknown' },
  { bucket: '2026-03', value: 'occupied', availability: 'unavailable' },
])('keeps missing occupancy distinct from vacant: %j', async point => {
  const tree = await render(available([point]));
  expect(action(tree, 'March 2026: Vacant')).toBeUndefined();
  expect(text(tree)).not.toContain('Vacant');
  await press(tree, 'March 2026: Not available');
  expect(text(tree)).toContain('Occupancy was not recorded for this month.');
});

it('clears a selected month when a refreshed series arrives, even if the same month remains', async () => {
  const series = available([{ bucket: '2026-01', value: 'occupied' }]);
  const tree = await render(series);
  await press(tree, 'January 2026: Occupied');
  await act(async () => tree.update(<ListingOccupancyCalendar series={available([{ bucket: '2026-01', value: 'vacant' }])} />));
  expect(action(tree, 'January 2026: Vacant').props.accessibilityState.selected).toBe(false);
  expect(text(tree)).toContain('Select a month for details.');
  expect(text(tree)).not.toContain('An accepted tenancy covered at least part of this month.');
});

it('shows empty and unavailable history without inventing vacant months', async () => {
  const empty = await render(available([]));
  expect(text(empty)).toContain('No occupancy history yet');
  expect(text(empty)).not.toContain('Vacant');
  const absent = await render(undefined);
  expect(text(absent)).toContain('Not available');
  expect(text(absent)).not.toContain('No occupancy history yet');
  const unavailable = await render({ availability: 'unavailable', reason: 'History is not recorded.', points: [{ bucket: '2026-01', value: 'vacant' }] });
  expect(text(unavailable)).toEqual(expect.arrayContaining(['Not available', 'History is not recorded.']));
  expect(action(unavailable, 'January 2026: Vacant')).toBeUndefined();
});

it('opens and closes the backend calculation details', async () => {
  const series = available([{ bucket: '2026-01', value: 'occupied' }]);
  const tree = await render(series);
  expect(tree.root.findAllByType(MetricDetails)).toHaveLength(0);
  await press(tree, 'Monthly occupancy calculation details');
  expect(tree.root.findByType(MetricDetails).props.metric).toBe(series);
  expect(text(tree)).toContain(series.definition);
  await press(tree, 'Close calculation details');
  expect(tree.root.findAllByType(MetricDetails)).toHaveLength(0);
});
