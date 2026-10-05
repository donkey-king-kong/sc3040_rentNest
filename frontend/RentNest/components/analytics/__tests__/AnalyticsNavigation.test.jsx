import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import OwnerAnalyticsScreen from '../../../app/OwnerAnalyticsScreen';
import AdminAnalyticsScreen from '../../../app/AdminAnalyticsScreen';
import ListingAnalyticsScreen from '../../../app/ListingAnalyticsScreen';
import { useAnalytics, useOwnedListings } from '../AnalyticsKit';
import listingResponse from './fixtures/listing-response.json';

let mockRouteParams = { listingId: '2' };
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack, canGoBack: mockCanGoBack, setParams: jest.fn() }),
  useLocalSearchParams: () => mockRouteParams,
}));
jest.mock('../AnalyticsKit', () => ({
  ...jest.requireActual('../AnalyticsKit'),
  useAnalytics: jest.fn(),
  useOwnedListings: jest.fn(),
}));
jest.mock('../../../config/api', () => ({
  API_BASE_URL: 'http://test.local',
  ENDPOINTS: { ANALYTICS_OWNER_SUMMARY: '/owner', ANALYTICS_ADMIN_SUMMARY: '/admin', ANALYTICS_OWNER_LISTING: id => `/listing/${id}` },
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../MorphingInfinity', () => () => null);

const text = tree => tree.root.findAllByType(Text).map(n => [].concat(n.props.children).filter(c => typeof c === 'string' || typeof c === 'number').join(''));
const press = async (tree, label) => {
  if (['1 month', '3 months'].includes(label)) {
    const dropdown = tree.root.findAll(n => n.props.accessibilityLabel === 'Analytics period' && typeof n.props.onPress === 'function')[0];
    await act(async () => dropdown.props.onPress());
  }
  const target = tree.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
  expect(target).toBeDefined();
  await act(async () => target.props.onPress());
};
const render = async Component => {
  let tree;
  await act(async () => { tree = create(<Component />); });
  return tree;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = { listingId: '2' };
  mockCanGoBack.mockReturnValue(true);
  useAnalytics.mockReturnValue({ data: listingResponse, loading: false });
  useOwnedListings.mockReturnValue({ loading: false, items: [{ listingID: 2, name: 'A2', type: 'Apartment', location: 'Singapore' }] });
});

it('owner navigation separates topics, retains the period and still opens property analytics', async () => {
  const tree = await render(OwnerAnalyticsScreen);
  expect(text(tree)).toContain('Overview');
  expect(text(tree)).toContain('Monthly rent recorded');
  expect(text(tree)).toEqual(expect.arrayContaining(['Offers sent in period', 'Offers accepted in period', 'Tenancies ended']));
  expect(text(tree)).not.toContain('Offers (all time)');
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Offers tab')).toHaveLength(0);
  await press(tree, '1 month');
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Rent tab')).toHaveLength(0);
  expect(text(tree)).toContain('Payments recorded');
  expect(useAnalytics).toHaveBeenLastCalledWith('/owner', '1M');
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Occupancy tab')).toHaveLength(0);
  expect(text(tree)).toContain('Occupancy trend');
  expect(text(tree)).toContain('Tenancy length');
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Analytics period' && node.props.onPress)).toHaveLength(1);
  expect(tree.root.findAll(node => node.props.label === 'Tenants hosted')).toHaveLength(1);
  const { CountBarChart } = require('../AnalyticsKit');
  expect(tree.root.findAllByType(CountBarChart)).toHaveLength(1);
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Tenancy length' && node.props.onPress)).toHaveLength(0);
  expect(text(tree)).toContain('Monthly rent recorded');
  await press(tree, 'Overview tab');
  expect(text(tree)).toEqual(expect.arrayContaining(['Offers sent in period', 'Offers accepted in period']));
  expect(text(tree)).toContain('Tenancies ended');
  expect(text(tree)).not.toContain('Offers (all time)');
  expect(text(tree)).not.toContain('Activity in this period');
  expect(text(tree)).toContain('Tenancy length');
  expect(useAnalytics).toHaveBeenLastCalledWith('/owner', '1M');
  await press(tree, '3 months');
  expect(useAnalytics).toHaveBeenLastCalledWith('/owner', '3M');
  await press(tree, '1 month');
  await press(tree, 'Properties tab');
  expect(text(tree)).toContain('By property');
  expect(text(tree)).not.toContain('Offers (all time)');
  await press(tree, 'View analytics for A2');
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/ListingAnalyticsScreen', params: { listingId: 2, period: '1M' } });
  await press(tree, 'Overview tab');
  expect(useAnalytics).toHaveBeenLastCalledWith('/owner', '1M');
});

it('admin overview combines rentals and users with one period control and a separate Safety tab', async () => {
  const tree = await render(AdminAnalyticsScreen);
  expect(text(tree)).toContain('Monthly rent recorded');
  expect(text(tree)).not.toContain('Moderation and safety');
  expect(text(tree)).toContain('Rental activity');
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Analytics period' && node.props.onPress)).toHaveLength(1);
  expect(tree.root.findAll(node => ['Rentals tab', 'Users tab'].includes(node.props.accessibilityLabel))).toHaveLength(0);
  expect(text(tree)).toContain('Rentals (all time)');
  expect(text(tree)).toContain('User distribution');
  expect(text(tree)).toContain('Rentals (all time)');
  await press(tree, 'Safety tab');
  expect(text(tree)).toContain('Moderation and safety');
  expect(text(tree)).toContain('Flagged items by type');
  expect(text(tree)).not.toContain('Not yet available');
  expect(text(tree)).not.toContain('Report resolution rate');
  await press(tree, 'Back to admin');
  expect(mockReplace).toHaveBeenCalledWith('/AdminScreen');
});

it('excludes Both and Neither from the admin chart without changing registered users', async () => {
  useAnalytics.mockReturnValue({ data: {
    ...listingResponse,
    metrics: { ...listingResponse.metrics, registeredUserCount: { availability: 'available', value: 20, unit: 'count' } },
    series: { ...listingResponse.series, userDistribution: { availability: 'available', points: [
      { bucket: 'Owners only', value: 2 }, { bucket: 'Tenants only', value: 3 },
      { bucket: 'Both', value: 4 }, { bucket: 'Neither', value: 11 },
    ] } },
  }, loading: false, retry: jest.fn() });
  const tree = await render(AdminAnalyticsScreen);
  expect(text(tree)).not.toContain('Both');
  expect(text(tree)).not.toContain('Neither');
  expect(text(tree)).toEqual(expect.arrayContaining(['Owners only', 'Tenants only', '2 (40.0%)', '3 (60.0%)']));
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Owners / tenants only: 5').length).toBeGreaterThan(0);
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Registered users: 20').length).toBeGreaterThan(0);
});

it('shows a completed days-on-market interval with both dates while retaining view tracking', async () => {
  useAnalytics.mockReturnValue({ data: {
    ...listingResponse,
    listing: { ...listingResponse.listing, listedAt: '2026-09-01T00:00:00Z', firstAcceptedAt: '2026-09-11T00:00:00Z' },
    metrics: { ...listingResponse.metrics, daysOnMarket: { availability: 'available', value: 10, unit: 'days', basis: 'snapshot' } },
  }, loading: false });
  const tree = await render(ListingAnalyticsScreen);
  expect(text(tree)).toEqual(expect.arrayContaining(['10.0 days', 'Published', 'First offer accepted', 'Listing views', 'Unique viewers']));
  expect(text(tree).some(t => t.includes('Sep 2026'))).toBe(true);
  expect(text(tree)).toContain('Payments recorded');
  expect(text(tree)).toContain('Time to accepted offer');
});

 it('owner analytics returns to the previous screen or falls back to profile', async () => {
  const tree = await render(OwnerAnalyticsScreen);
  await press(tree, 'Back to profile');
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();
  mockCanGoBack.mockReturnValue(false);
  await press(tree, 'Back to profile');
  expect(mockReplace).toHaveBeenCalledWith('/ProfileScreen');
 });

it.each(['loaded', 'error'])('property analytics supports back navigation when %s', async state => {
  if (state === 'error') useAnalytics.mockReturnValue({ data: null, loading: false, error: 'Unable to load analytics', retry: jest.fn() });
  const tree = await render(ListingAnalyticsScreen);
  await press(tree, 'Back to owner analytics');
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();
  mockCanGoBack.mockReturnValue(false);
  await press(tree, 'Back to owner analytics');
  expect(mockReplace).toHaveBeenCalledWith('/OwnerAnalyticsScreen');
});

it('property analytics shows the requested loading message before displaying its header', async () => {
  useAnalytics.mockReturnValue({ data: null, loading: true });
  const tree = await render(ListingAnalyticsScreen);
  expect(text(tree)).toContain('Loading analytics...');
  expect(text(tree)).not.toContain('Property analytics');
  await act(async () => tree.unmount());
});

it('admin rentals divides recorded offers without double counting and removes user growth', async () => {
  useAnalytics.mockReturnValue({ data: {
    ...listingResponse,
    metrics: { ...listingResponse.metrics,
      rentalRecordCount: { availability: 'available', value: 10, unit: 'count' },
      acceptedRentalRecordCount: { availability: 'available', value: 6, unit: 'count' },
      pendingRentalRecordCount: { availability: 'available', value: 4, unit: 'count' },
      terminatedRentalRecordCount: { availability: 'available', value: 3, unit: 'count' },
      terminationRate: { availability: 'available', value: 50, unit: 'percent' },
    },
  }, loading: false });
  const tree = await render(AdminAnalyticsScreen);
  expect(text(tree)).toEqual(expect.arrayContaining(['Recorded offers', '10', 'Pending', 'Active', 'Terminated', '3 (30.0%)', '4 (40.0%)', 'Terminated / accepted', '50.0%']));
  expect(text(tree)).not.toContain('Acceptance rate');
  expect(text(tree)).toContain('User distribution');
  expect(text(tree)).not.toContain('Growth in this period');
  expect(text(tree)).not.toContain('New users');
});

it('does not fabricate an offer distribution when counts are unavailable', async () => {
  useAnalytics.mockReturnValue({ data: { ...listingResponse, metrics: {
    ...listingResponse.metrics,
    rentalRecordCount: { availability: 'unavailable', reason: 'Offer history unavailable' },
  } }, loading: false });
  const tree = await render(AdminAnalyticsScreen);
  expect(text(tree)).toContain('Offer history unavailable');
  expect(text(tree)).not.toContain('Recorded offers');
});

it('property analytics shows all sections on one page and retains period selection', async () => {
  const tree = await render(ListingAnalyticsScreen);
  expect(text(tree)).toEqual(expect.arrayContaining(['Offers sent', 'Offers accepted']));
  expect(text(tree)).not.toContain('Tenancies ended');
  expect(text(tree)).not.toContain('Activity in this period');
  expect(text(tree)).not.toContain('Offers and tenancies (all time)');
  expect(tree.root.findAll(node => node.props.accessibilityRole === 'tab')).toHaveLength(0);
  expect(text(tree)).toEqual(expect.arrayContaining(['Listing interest', 'Monthly rent recorded', 'Month by month', 'Time to accepted offer']));
  expect(text(tree)).toContain('Acceptance rate');
  await press(tree, '1 month');
  expect(useAnalytics).toHaveBeenLastCalledWith('/listing/2', '1M');
  await press(tree, '3 months');
  expect(useAnalytics).toHaveBeenLastCalledWith('/listing/2', '3M');
});

it('owner places the period below tabs and hides it on Properties without losing the selection', async () => {
  const tree = await render(OwnerAnalyticsScreen);
  const labels = text(tree);
  expect(labels.indexOf('Period')).toBeGreaterThan(labels.indexOf('Properties'));
  await press(tree, '3 months');
  await press(tree, 'Properties tab');
  expect(text(tree)).not.toContain('Period');
  expect(tree.root.findAll(node => node.props.accessibilityLabel === '3 months')).toHaveLength(0);
  await press(tree, 'Overview tab');
  expect(text(tree)).toContain('Period');
  expect(useAnalytics).toHaveBeenLastCalledWith('/owner', '3M');
});

it.each([OwnerAnalyticsScreen, ListingAnalyticsScreen, AdminAnalyticsScreen])('refreshes analytics without changing its selected period', async Component => {
  const retry = jest.fn();
  useAnalytics.mockReturnValue({ data: listingResponse, loading: false, retry });
  const tree = await render(Component);
  expect(text(tree).some(value => value.includes('vs previous period'))).toBe(false);
  await press(tree, '3 months');
  await press(tree, 'Refresh analytics');
  expect(retry).toHaveBeenCalledTimes(1);
  expect(useAnalytics.mock.calls.at(-1)[1]).toBe('3M');
});
it('does not display a contradictory rental status breakdown', async () => {
  const metric = value => ({ availability: 'available', value, unit: 'count' });
  useAnalytics.mockReturnValue({ data: { ...listingResponse, metrics: { rentalRecordCount: metric(10), acceptedRentalRecordCount: metric(6), pendingRentalRecordCount: metric(5), terminatedRentalRecordCount: metric(3) } }, loading: false });
  const tree = await render(AdminAnalyticsScreen);
  expect(text(tree)).toContain('Rental status counts cannot be reconciled.');
});

it('omits overview offer totals and retains occupied listing calculation details', async () => {
  const metric = (value, basis) => ({ availability: 'available', value, unit: 'count', basis });
  useAnalytics.mockReturnValue({ data: { ...listingResponse, metrics: { ...listingResponse.metrics, rentalRecordCount: metric(5, 'snapshot'), acceptedRentalRecordCount: metric(3, 'snapshot'), offersAcceptedCount: metric(1, 'period'), activeTenancyCount: metric(2, 'snapshot') } }, loading: false });
  const tree = await render(OwnerAnalyticsScreen);
  expect(text(tree)).toEqual(expect.arrayContaining(['Occupied listings', '2']));
  expect(text(tree)).not.toContain('Offers sent');
  expect(text(tree)).not.toContain('Offers accepted');
  expect(text(tree)).not.toContain('All time');
  expect(text(tree)).not.toContain('Now');
  const occupied = tree.root.findAll(node => node.props.accessibilityLabel === 'Occupied listings: 2' && node.props.onPress)[0];
  expect(occupied).toBeDefined();
  await act(async () => occupied.props.onPress());
  expect(text(tree)).toContain('Now');
});

it('hides the period control on admin Safety while retaining refresh', async () => {
  useAnalytics.mockReturnValue({ data: listingResponse, loading: false, retry: jest.fn() });
  const tree = await render(AdminAnalyticsScreen);
  for (const tab of ['Safety']) {
    await press(tree, tab + ' tab');
    expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Analytics period')).toHaveLength(0);
    expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Refresh analytics').length).toBeGreaterThan(0);
    expect(text(tree).some(value => value.includes('Jan 2026'))).toBe(false);
  }
});
it('separates all-time totals from filtered activity and hides stale period figures while loading', async () => {
  const { ActivitySection } = require('../AnalyticsLayout');
  useAnalytics.mockReturnValue({ data: listingResponse, loading: true, retry: jest.fn() });
  const tree = await render(OwnerAnalyticsScreen);
  const activity = tree.root.findByType(ActivitySection);
  expect(activity.findAll(node => node.props.label === 'Offers accepted')).toHaveLength(0);
  expect(text(tree)).toContain('Overview');
  expect(text(tree)).not.toContain('Monthly rent recorded');
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Loading period activity').length).toBeGreaterThan(0);
});

it('opens property analytics with the period passed by the owner dashboard', async () => {
  mockRouteParams = { listingId: '2', period: '3M' };
  await render(ListingAnalyticsScreen);
  expect(useAnalytics).toHaveBeenLastCalledWith('/listing/2', '3M');
});

it('hides property history during refresh and displays the returned history afterwards', async () => {
  const retry = jest.fn();
  useAnalytics.mockReturnValue({ data: listingResponse, loading: false, retry });
  const tree = await render(ListingAnalyticsScreen);
  expect(text(tree)).toContain('Time to accepted offer');
  await press(tree, 'Refresh analytics');
  expect(retry).toHaveBeenCalledTimes(1);
  useAnalytics.mockReturnValue({ data: listingResponse, loading: true, retry });
  await act(async () => tree.update(<ListingAnalyticsScreen />));
  expect(text(tree)).not.toContain('Listing history');
  expect(text(tree)).not.toContain('Time to accepted offer');
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Loading period activity').length).toBeGreaterThan(0);
  const updated = { ...listingResponse, metrics: { ...listingResponse.metrics, rentalRecordCount: { availability: 'available', value: 7, unit: 'count' } } };
  useAnalytics.mockReturnValue({ data: updated, loading: false, retry });
  await act(async () => tree.update(<ListingAnalyticsScreen />));
  expect(text(tree)).toContain('Time to accepted offer');
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Offers sent: 7').length).toBeGreaterThan(0);
});

it.each([OwnerAnalyticsScreen, ListingAnalyticsScreen, AdminAnalyticsScreen])('shows Refreshing beside the refresh control while loading and restores the timestamp afterwards', async Component => {
  const data = { ...listingResponse, asOf: '2026-10-05T19:19:00Z' };
  useAnalytics.mockReturnValue({ data, loading: true, retry: jest.fn() });
  const tree = await render(Component);
  expect(text(tree)).toContain('Refreshing...');
  expect(text(tree).some(value => /Updated|Updating/.test(value))).toBe(false);
  useAnalytics.mockReturnValue({ data, loading: false, retry: jest.fn() });
  await act(async () => tree.update(<Component />));
  expect(text(tree).some(value => value.includes('Updated'))).toBe(true);
  expect(text(tree)).not.toContain('Refreshing...');
});
