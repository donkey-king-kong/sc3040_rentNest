import React from 'react';
import { Image, Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import OwnerAnalyticsScreen from '../../../app/OwnerAnalyticsScreen';
import AdminAnalyticsScreen from '../../../app/AdminAnalyticsScreen';
import ListingAnalyticsScreen from '../../../app/ListingAnalyticsScreen';
import { useAnalytics, useOwnedListings } from '../AnalyticsKit';
import listingResponse from './fixtures/listing-response.json';
import adminResponse from './fixtures/admin-response.json';
import ownerResponse from './fixtures/owner-response.json';

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
  useAnalytics.mockImplementation(path => ({ data: path === '/owner' ? ownerResponse : path === '/admin' ? adminResponse : listingResponse, loading: false }));
  useOwnedListings.mockReturnValue({ loading: false, items: [{ listingID: 2, name: 'A2', type: 'Apartment', location: 'Singapore' }] });
});

it('owner navigation separates topics and uses the fixed year for property analytics', async () => {
  useAnalytics.mockReturnValue({ data: { ...ownerResponse }, loading: false });
  const tree = await render(OwnerAnalyticsScreen);
  expect(text(tree)).toContain('Overview');
  expect(text(tree)).toContain('Monthly Rent Recorded');
  expect(text(tree)).toEqual(expect.arrayContaining(['Monthly Rental Activity', 'Terminations', 'Average Days on Market']));
  expect(text(tree)).not.toContain('Offers sent');
  expect(text(tree)).not.toContain('Rental activity');
  expect(text(tree)).not.toContain('Offers (all time)');
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Offers tab')).toHaveLength(0);
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Rent tab')).toHaveLength(0);
  expect(text(tree)).not.toContain('Payments recorded');
  expect(useAnalytics).toHaveBeenLastCalledWith('/owner');
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Occupancy tab')).toHaveLength(0);
  expect(text(tree)).toContain('Monthly Occupancy');
  expect(text(tree)).toContain('Tenancy Length');
  expect(tree.root.findAll(node => node.props.label === 'Tenants Hosted')).toHaveLength(1);
  const { CountBarChart } = require('../AnalyticsKit');
  expect(tree.root.findAllByType(CountBarChart)).toHaveLength(1);
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Tenancy Length' && node.props.onPress)).toHaveLength(0);
  expect(text(tree)).toContain('Monthly Rent Recorded');
  await press(tree, 'Overview tab');
  expect(text(tree)).toContain('Monthly Rental Activity');
  expect(text(tree)).toContain('Terminations');
  expect(text(tree)).not.toContain('Offers (all time)');
  expect(text(tree)).not.toContain('Activity in this period');
  expect(text(tree)).toContain('Tenancy Length');
  expect(useAnalytics).toHaveBeenLastCalledWith('/owner');
  expect(useAnalytics).toHaveBeenLastCalledWith('/owner');
  await press(tree, 'Properties tab');
  expect(text(tree)).toContain('By Property');
  expect(text(tree)).not.toContain('Offers (all time)');
  await press(tree, 'View analytics for A2');
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/ListingAnalyticsScreen', params: { listingId: 2 } });
  await press(tree, 'Overview tab');
  expect(useAnalytics).toHaveBeenLastCalledWith('/owner');
});

it('admin overview displays account status', async () => {
  useAnalytics.mockReturnValue({ data: { ...adminResponse, blockedUsers: 1, registeredUsers: 4, totalRentCollected: 6500, activeRentals: 1, upcomingRentals: 0, expiredRentals: 0, unclassifiedRentals: 0 }, loading: false });
  const tree = await render(AdminAnalyticsScreen);
  expect(text(tree)).toContain('Monthly Rent Recorded');
  expect(text(tree)).not.toContain('Moderation and safety');
  expect(text(tree)).not.toContain('Rental activity');
  expect(text(tree)).not.toContain('Past 12 months');
  expect(tree.root.findAll(node => ['Rentals tab', 'Users tab'].includes(node.props.accessibilityLabel))).toHaveLength(0);
  expect(text(tree)).toContain('Rentals');
  expect(text(tree)).not.toContain('User overview');
  expect(text(tree)).toContain('Rentals');
  expect(tree.root.findAll(node => node.props.accessibilityRole === 'tab')).toHaveLength(0);
  expect(text(tree)).not.toContain('Reported records');
  expect(text(tree)).toEqual(expect.arrayContaining(['Allowed to Sign In', 'Blocked from Signing In']));
  const { PieChart } = require('../AnalyticsKit');
  expect(tree.root.findAllByType(PieChart).find(node => node.props.totalLabel === 'Registered Users').props.series.points).toEqual([
    { bucket: 'Allowed to Sign In', value: 3 }, { bucket: 'Blocked from Signing In', value: 1 },
  ]);
  expect(text(tree)).toEqual(expect.arrayContaining(['1 (25.0%)', '3 (75.0%)']));
  const { StatTile } = require('../AnalyticsKit');
  const overviewTiles = tree.root.findAllByType(StatTile).slice(0, 4);
  expect(overviewTiles.map(node => node.props.label)).toEqual(['Registered Users', 'Listings', 'Total Rent Collected', 'Active Rentals']);
  expect(overviewTiles[2].props.metric.value).toBe(6500);
  expect(overviewTiles[3].props.metric.value).toBe(1);
  expect(tree.root.findAllByType(StatTile).filter(node => ['Unrestricted users', 'Restricted users'].includes(node.props.label))).toHaveLength(0);
  expect(text(tree)).toEqual(expect.arrayContaining(['Property and Tenancy Activity', 'User Accounts']));
  const accountChart = tree.root.findAllByType(PieChart).find(node => node.props.title === 'User Accounts');
  expect(accountChart.props.metricLabel).toBe('Total Users');
  expect(accountChart.props.totalMetric.value).toBe(4);
  for (const label of ['Total reported', 'Reported listings', 'Reported users', 'Reported reviews']) {
    expect(text(tree)).not.toContain(label);
  }
  expect(text(tree)).not.toContain('Not yet available');
  expect(text(tree)).not.toContain('Report resolution rate');
  await press(tree, 'Back to admin');
  expect(mockReplace).toHaveBeenCalledWith('/AdminScreen');
});

it('shows property owners and separate current and past tenants without changing registered users', async () => {
  useAnalytics.mockReturnValue({ data: { ...adminResponse, registeredUsers: 20, propertyOwners: 6, currentTenants: 3, expiredTenants: 1, terminatedTenants: 1 }, loading: false, retry: jest.fn() });
  const tree = await render(AdminAnalyticsScreen);
  expect(text(tree)).not.toContain('Both');
  expect(text(tree)).not.toContain('Neither');
  expect(text(tree)).toEqual(expect.arrayContaining(['Property Owners', 'Current Tenants', 'Lease Expired', 'Tenancy Terminated']));
  const { CountBarChart } = require('../AnalyticsKit');
  const chart = tree.root.findAllByType(CountBarChart).find(node => node.props.series.points[0]?.bucket === 'Property Owners');
  expect(chart.props.series.points.map(point => point.value)).toEqual([6, 3, 1, 1]);
  expect(chart.props.totalLabel).toBe('Total Users');
  expect(chart.props.title).toBe('Property and Tenancy Activity');
  expect(chart.props.totalMetric.value).toBe(20);
  expect(chart.props.scaleToTotal).toBeUndefined();
  expect(text(tree)).toEqual(expect.arrayContaining(['6', '3', '1']));
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Registered Users: 20').length).toBeGreaterThan(0);
});

it('keeps current and past tenant labels visible when the backend does not return the metrics', async () => {
  useAnalytics.mockReturnValue({ data: { ...adminResponse, currentTenants: null, expiredTenants: null, terminatedTenants: null }, loading: false });
  const tree = await render(AdminAnalyticsScreen);
  const { CountBarChart } = require('../AnalyticsKit');
  const chart = tree.root.findAllByType(CountBarChart).find(node => node.props.series.points[0]?.bucket === 'Property Owners');
  expect(text(tree)).toEqual(expect.arrayContaining(['Current Tenants', 'Lease Expired', 'Tenancy Terminated']));
  expect(chart.props.series.points.slice(1).every(point => point.availability === 'unavailable' && point.value === null)).toBe(true);
});

it('shows a completed days-on-market interval with both dates while retaining view tracking', async () => {
  useAnalytics.mockReturnValue({ data: { ...listingResponse, listedAt: '2026-09-01T00:00:00Z', firstAcceptedAt: '2026-09-11T00:00:00Z', daysOnMarket: 10 }, loading: false });
  const tree = await render(ListingAnalyticsScreen);
  expect(text(tree)).toEqual(expect.arrayContaining(['10.0 days', 'Published', 'First Offer Accepted', 'Listing Views', 'Unique Viewers']));
  expect(text(tree)).toEqual(expect.arrayContaining(['1 Sep 2026', '11 Sep 2026']));
  const accessibleTimeline = tree.root.findAll(node => node.props.accessibilityLabel ===
    'Days on Market: 10.0 days. Published: 1 Sep 2026. First Offer Accepted: 11 Sep 2026'
    && typeof node.props.onPress === 'function');
  expect(accessibleTimeline.length).toBeGreaterThan(0);
  await act(async () => accessibleTimeline[0].props.onPress());
  const { MetricDetails } = require('../AnalyticsKit');
  expect(tree.root.findByType(MetricDetails).props.label).toBe('Days on Market');
  expect(text(tree)).toContain('Payments Recorded');
  expect(text(tree)).toContain('Time to Accepted Offer');
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

it('keeps the property header and back navigation available during initial loading', async () => {
  useAnalytics.mockReturnValue({ data: null, loading: true });
  const tree = await render(ListingAnalyticsScreen);
  const { AdminLoadingState } = require('../../AdminUI');
  expect(text(tree)).toContain('Property Analytics');
  expect(tree.root.findAllByType(AdminLoadingState)).toHaveLength(1);
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Loading property analytics').length).toBeGreaterThan(0);
  expect(text(tree)).not.toContain('Rent Recorded');
  await press(tree, 'Back to owner analytics');
  expect(mockBack).toHaveBeenCalledTimes(1);
  await act(async () => tree.unmount());
});

it('admin rental categories reconcile with total offers', async () => {
  useAnalytics.mockReturnValue({ data: { ...adminResponse, totalRentalOffers: 10, pendingRentals: 4, terminatedRentals: 3, activeRentals: 1, upcomingRentals: 1, expiredRentals: 1, unclassifiedRentals: 0 }, loading: false });
  const tree = await render(AdminAnalyticsScreen);
  expect(text(tree)).toEqual(expect.arrayContaining(['Total Rental Offers', '10', 'Pending', 'Active', 'Terminated', '3 (30.0%)', '4 (40.0%)']));
  expect(text(tree)).toEqual(expect.arrayContaining(['Upcoming', 'Expired', '1 (10.0%)']));
  expect(text(tree)).not.toContain('Details Unavailable');
  expect(text(tree)).not.toContain('Terminated / accepted');
  const { PieChart, MetricRow } = require('../AnalyticsKit');
  const offers = tree.root.findAllByType(PieChart).find(node => node.props.totalLabel === 'Recorded Offers');
  expect(offers.props.series.points.reduce((sum, point) => sum + point.value, 0)).toBe(10);
  expect(offers.findByType(MetricRow).props.metric.value).toBe(10);
  expect(text(tree).indexOf('Rentals')).toBeLessThan(text(tree).indexOf('Monthly Rent Recorded'));
  expect(text(tree).indexOf('Total Rental Offers')).toBeLessThan(text(tree).indexOf('Monthly Rent Recorded'));
  expect(text(tree)).not.toContain('Acceptance rate');
  expect(text(tree)).not.toContain('User overview');
  expect(text(tree)).not.toContain('Growth in this period');
  expect(text(tree)).not.toContain('New users');
});

it('does not fabricate an offer distribution when counts are unavailable', async () => {
  useAnalytics.mockReturnValue({ data: { ...adminResponse, totalRentalOffers: null }, loading: false });
  const tree = await render(AdminAnalyticsScreen);
  expect(text(tree)).toContain('Rental status counts cannot be reconciled.');
  expect(text(tree)).not.toContain('Recorded Offers');
});

it('property analytics retains all sections on one page with a fixed past-year period', async () => {
  const tree = await render(ListingAnalyticsScreen);
  expect(text(tree)).toEqual(expect.arrayContaining([
    'Overview', 'Payments Recorded', 'Monthly Rent Recorded', 'Monthly Occupancy',
    'Tenancy History', 'Offers Sent', 'Offers Accepted', 'Acceptance Rate',
    'Average Tenancy', 'Tenants Hosted', 'Time to Accepted Offer', 'Days on Market',
  ]));
  expect(tree.root.findAll(node => node.props.accessibilityRole === 'tab')).toHaveLength(0);
  expect(text(tree)).not.toContain('Change property');
  expect(useAnalytics).toHaveBeenLastCalledWith('/listing/2');
});

it('owner tabs preserve property navigation', async () => {
  const tree = await render(OwnerAnalyticsScreen);
  const labels = text(tree);
  expect(labels).not.toContain('Past 12 months');
  await press(tree, 'Properties tab');
  expect(text(tree)).not.toContain('Period');
  await press(tree, 'Overview tab');
  expect(text(tree)).not.toContain('Past 12 months');
  expect(useAnalytics).toHaveBeenLastCalledWith('/owner');
});

it.each([OwnerAnalyticsScreen, ListingAnalyticsScreen, AdminAnalyticsScreen])('refreshes analytics using the fixed past-year period', async Component => {
  const retry = jest.fn();
  useAnalytics.mockReturnValue({ data: listingResponse, loading: false, retry });
  const tree = await render(Component);
  expect(text(tree).some(value => value.includes('vs previous period'))).toBe(false);
  await press(tree, 'Refresh analytics');
  expect(retry).toHaveBeenCalledTimes(1);
  const endpoint = Component === OwnerAnalyticsScreen ? '/owner'
    : Component === ListingAnalyticsScreen ? '/listing/2' : '/admin';
  expect(useAnalytics.mock.calls.at(-1)).toEqual([endpoint]);
});
it('does not display a contradictory rental status breakdown', async () => {
  useAnalytics.mockReturnValue({ data: { ...adminResponse, totalRentalOffers: 10, pendingRentals: 5, terminatedRentals: 3 }, loading: false });
  const tree = await render(AdminAnalyticsScreen);
  expect(text(tree)).toContain('Rental status counts cannot be reconciled.');
});

it('owner displays rental charts and occupancy details', async () => {
  useAnalytics.mockReturnValue({ data: { ...ownerResponse, totalListings: 3, occupiedListings: 2 }, loading: false });
  const tree = await render(OwnerAnalyticsScreen);
  expect(text(tree)).toContain('Occupied Listings');
  const { PieChart } = require('../AnalyticsKit');
  const occupancy = tree.root.findByType(PieChart);
  expect(occupancy.props.series.points).toEqual([{ bucket: 'Occupied Listings', value: 2 }, { bucket: 'Vacant Listings', value: 1 }]);
  expect(occupancy.props.totalMetric.value).toBe(3);
  expect(text(tree)).not.toContain('Offers sent');
  const { StatTile, BarChart, LineChart } = require('../AnalyticsKit');
  expect(tree.root.findAllByType(StatTile).some(node => ['Offers Accepted', 'Average Days on Market'].includes(node.props.label))).toBe(false);
  expect(tree.root.findByType(BarChart).props.title).toBe('Average Days on Market');
  expect(tree.root.findAllByType(LineChart).some(node => node.props.title === 'Monthly Rental Activity')).toBe(true);
  expect(text(tree)).not.toContain('All time');
  expect(text(tree)).not.toContain('Now');
  const occupied = occupancy.findAll(node => node.props.accessibilityLabel === 'Chart calculation details' && node.props.onPress)[0];
  expect(occupied).toBeDefined();
  await act(async () => occupied.props.onPress());
  expect(text(tree)).not.toContain('Now');
});

it('integrates admin safety statistics with activity and a single refresh control', async () => {
  const retry = jest.fn();
  useAnalytics.mockReturnValue({ data: adminResponse, loading: false, retry });
  const tree = await render(AdminAnalyticsScreen);
  const { RefreshControl } = require('../AnalyticsLayout');
  expect(tree.root.findAllByType(RefreshControl)).toHaveLength(1);
  expect(tree.root.findAll(node => node.props.accessibilityRole === 'tab')).toHaveLength(0);
  expect(text(tree)).toContain('Monthly Rent Recorded');
  expect(text(tree)).not.toContain('Reported records');
  expect(text(tree)).not.toContain('User overview');
  await press(tree, 'Refresh analytics');
  expect(retry).toHaveBeenCalledTimes(1);
});
it('owner hides all metrics during refresh while keeping its header, tabs and refresh control', async () => {
  const { StatTile, CountBarChart, LineChart, PieChart, BarChart } = require('../AnalyticsKit');
  useAnalytics.mockReturnValue({ data: ownerResponse, loading: true, retry: jest.fn() });
  const tree = await render(OwnerAnalyticsScreen);
  for (const component of [StatTile, CountBarChart, LineChart, PieChart, BarChart]) {
    expect(tree.root.findAllByType(component)).toHaveLength(0);
  }
  expect(text(tree)).toContain('Overview');
  expect(text(tree)).not.toContain('Monthly Rent Recorded');
  expect(text(tree)).toContain('Analytics');
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Refreshing analytics').length).toBeGreaterThan(0);
  expect(tree.root.findAll(node => node.props.accessibilityRole === 'tab' && node.props.onPress)).toHaveLength(2);
  const refresh = tree.root.findAll(node => node.props.accessibilityLabel === 'Refresh analytics' && node.props.onPress)[0];
  expect(refresh.props.disabled).toBe(true);
  useAnalytics.mockReturnValue({ data: ownerResponse, loading: false, retry: jest.fn() });
  await act(async () => tree.update(<OwnerAnalyticsScreen />));
  expect(text(tree)).toContain('Monthly Rent Recorded');
  expect(tree.root.findAllByType(StatTile)).toHaveLength(6);
});

it('opens property analytics using the fixed past-year period', async () => {
  mockRouteParams = { listingId: '2' };
  await render(ListingAnalyticsScreen);
  expect(useAnalytics).toHaveBeenLastCalledWith('/listing/2');
});

it('hides property history during refresh and displays the returned history afterwards', async () => {
  const retry = jest.fn();
  useAnalytics.mockReturnValue({ data: listingResponse, loading: false, retry });
  const tree = await render(ListingAnalyticsScreen);
  expect(text(tree)).toContain('Time to Accepted Offer');
  await press(tree, 'Refresh analytics');
  expect(retry).toHaveBeenCalledTimes(1);
  useAnalytics.mockReturnValue({ data: listingResponse, loading: true, retry });
  await act(async () => tree.update(<ListingAnalyticsScreen />));
  expect(text(tree)).not.toContain('Tenancy History');
  expect(text(tree)).not.toContain('Time to Accepted Offer');
  expect(text(tree)).toEqual(expect.arrayContaining(['Property Analytics', 'A2']));
  const { StatTile, LineChart } = require('../AnalyticsKit');
  expect(tree.root.findAllByType(StatTile)).toHaveLength(0);
  expect(tree.root.findAllByType(LineChart)).toHaveLength(0);
  const refresh = tree.root.findAll(node => node.props.accessibilityLabel === 'Refresh analytics' && node.props.onPress)[0];
  expect(refresh.props.disabled).toBe(true);
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Refreshing property analytics').length).toBeGreaterThan(0);
  const updated = { ...listingResponse, totalRentalOffers: 7 };
  useAnalytics.mockReturnValue({ data: updated, loading: false, retry });
  await act(async () => tree.update(<ListingAnalyticsScreen />));
  expect(text(tree)).toContain('Time to Accepted Offer');
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Offers Sent: 7').length).toBeGreaterThan(0);
});

it.each([OwnerAnalyticsScreen, ListingAnalyticsScreen])('shows Refreshing beside the refresh control while loading and restores the timestamp afterwards', async Component => {
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

it('uses period metrics for property performance and all-time metrics for tenancy history', async () => {
  const data = { ...listingResponse, rentCollected: 18450, paymentCount: 7, occupancyRate: 62.4, totalViews: 186, uniqueViewers: 93, totalRentalOffers: 9, acceptedOffers: 6, acceptanceRate: 66.7, averageTenancyMonths: 14.5, tenantsHosted: 4 };
  useAnalytics.mockReturnValue({ data, loading: false });
  const tree = await render(ListingAnalyticsScreen);
  const { StatTile, MetricRow, LineChart } = require('../AnalyticsKit');
  for (const [label, key] of [
    ['Rent Recorded', 'rentCollected'], ['Average Occupancy', 'occupancyRate'],
    ['Listing Views', 'totalViews'], ['Unique Viewers', 'uniqueViewers'],
  ]) {
    expect(tree.root.findAllByType(StatTile).find(node => node.props.label === label).props.metric).toMatchObject({ value: data[key] });
  }
  for (const [label, key] of [
    ['Payments Recorded', 'paymentCount'], ['Offers Sent', 'totalRentalOffers'],
    ['Offers Accepted', 'acceptedOffers'], ['Acceptance Rate', 'acceptanceRate'],
    ['Average Tenancy', 'averageTenancyMonths'], ['Tenants Hosted', 'tenantsHosted'],
  ]) {
    expect(tree.root.findAllByType(MetricRow).find(node => node.props.label === label).props.metric).toMatchObject({ value: data[key] });
  }
  expect(text(tree)).toEqual(expect.arrayContaining(['S$18,450', '62.4%', '186', '93', '14.5 mo']));
  expect(tree.root.findByType(LineChart).props.series).toMatchObject({ points: data.monthlyRent.map(point => ({ bucket: point.label, value: point.value })) });
  const ListingOccupancyCalendar = require('../ListingOccupancyCalendar').default;
  expect(tree.root.findByType(ListingOccupancyCalendar).props.series).toMatchObject({ points: data.monthlyOccupancy.map(point => ({ bucket: point.label, value: point.status })) });
  await press(tree, 'Offers Sent: 9');
  expect(text(tree)).toContain('All time');
});

it.each([
  [null, null, 'The publication date was not recorded for this listing.', 2],
  ['2026-09-01T00:00:00Z', null, 'No rental offer has been accepted yet.', 1],
])('does not invent days on market when the interval is incomplete', async (listedAt, firstAcceptedAt, reason, missingDates) => {
  const metric = { availability: 'unavailable', value: null, unit: 'days', reason };
  useAnalytics.mockReturnValue({ data: { ...listingResponse, listedAt, firstAcceptedAt, daysOnMarketUnavailableReason: metric.reason, daysOnMarket: metric.value }, loading: false });
  const tree = await render(ListingAnalyticsScreen);
  expect(text(tree)).toContain('Not available');
  expect(text(tree)).toContain(reason);
  expect(text(tree).filter(value => value === 'Not recorded')).toHaveLength(missingDates);
  expect(text(tree)).toEqual(expect.arrayContaining(['Published', 'First Offer Accepted']));
  const { StatTile } = require('../AnalyticsKit');
  expect(tree.root.findAllByType(StatTile).find(node => node.props.label === 'Days on Market').props.metric).toMatchObject(metric);
});

it('does not label unknown property occupancy as vacant', async () => {
  useAnalytics.mockReturnValue({ data: { ...listingResponse, occupancyStatus: null }, loading: false });
  const tree = await render(ListingAnalyticsScreen);
  expect(text(tree)).toContain('Status unavailable');
});

it('lets a signed-out user reach login from the property screen', async () => {
  useAnalytics.mockReturnValue({ data: null, loading: false, unauthenticated: true });
  const tree = await render(ListingAnalyticsScreen);
  const { ErrorState } = require('../AnalyticsKit');
  const error = tree.root.findByType(ErrorState);
  expect(text(tree)).toEqual(expect.arrayContaining(['Property Analytics', 'Please log in to view analytics.', 'Go to login']));
  expect(error.props.actionLabel).toBe('Go to login');
  await act(async () => error.props.onRetry());
  expect(mockReplace).toHaveBeenCalledWith('/LandingScreen');
});

it('retries failed property analytics requests without losing back navigation', async () => {
  const retry = jest.fn();
  useAnalytics.mockReturnValue({ data: null, loading: false, error: 'Unable to load analytics', retry });
  const tree = await render(ListingAnalyticsScreen);
  const { ErrorState } = require('../AnalyticsKit');
  expect(text(tree)).toEqual(expect.arrayContaining(['Property Analytics', 'Unable to load analytics', 'Try again']));
  await act(async () => tree.root.findByType(ErrorState).props.onRetry());
  expect(retry).toHaveBeenCalledTimes(1);
  await press(tree, 'Back to owner analytics');
  expect(mockBack).toHaveBeenCalledTimes(1);
});

it('preserves property information after a failed photo and retries when its URL changes', async () => {
  const photoData = url => ({ ...listingResponse, listingPicture: url });
  useAnalytics.mockReturnValue({ data: photoData('https://example.test/property.jpg'), loading: false });
  const tree = await render(ListingAnalyticsScreen);
  const photo = tree.root.findByType(Image);
  expect(photo.props.source.uri).toBe('https://example.test/property.jpg');
  expect(photo.props.accessible).toBe(false);
  await act(async () => photo.props.onError({ nativeEvent: { error: 'Image not found' } }));
  expect(tree.root.findAllByType(Image)).toHaveLength(0);
  expect(text(tree)).toEqual(expect.arrayContaining(['A2', 'HDB', 'Vacant', 'Rent Recorded']));
  useAnalytics.mockReturnValue({ data: photoData('https://example.test/replacement.jpg'), loading: false });
  await act(async () => tree.update(<ListingAnalyticsScreen />));
  expect(tree.root.findByType(Image).props.source.uri).toBe('https://example.test/replacement.jpg');
});

it('retains accessible publication history when an older response omits days on market', async () => {
  const { daysOnMarket, daysOnMarketUnavailableReason, ...data } = listingResponse;
  useAnalytics.mockReturnValue({ data, loading: false });
  const tree = await render(ListingAnalyticsScreen);
  expect(text(tree)).toEqual(expect.arrayContaining(['Days on Market', 'Not available', 'Listing history is not available.']));
  expect(tree.root.findAll(node => node.props.accessibilityLabel ===
    'Days on Market: Not available. Published: Not recorded. First Offer Accepted: Not recorded'
    && typeof node.props.onPress === 'function').length).toBeGreaterThan(0);
});

it('shows owner unavailable explanations without turning missing averages into zero', async () => {
  useAnalytics.mockReturnValue({ data: {
    ...ownerResponse, totalListings: 0, occupiedListings: 0, totalViews: 0, totalRentCollected: 0,
    reviewCount: 0, averageRating: null, averageRatingUnavailableReason: 'No reviews yet.',
    averageTenancyMonths: null, averageTenancyUnavailableReason: 'No accepted rentals with valid start and end dates.',
    monthlyOccupancy: null, monthlyOccupancyUnavailableReason: 'No listings, so occupancy cannot be calculated.',
  }, loading: false });
  const tree = await render(OwnerAnalyticsScreen);
  const { StatTile, LineChart } = require('../AnalyticsKit');
  const tiles = tree.root.findAllByType(StatTile);
  expect(tiles.find(node => node.props.label === 'Total Rent Collected').props.metric).toMatchObject({ availability: 'available', value: 0 });
  expect(tiles.find(node => node.props.label === 'Rating and Reviews').props.metric).toMatchObject({ availability: 'unavailable', value: null, reason: 'No reviews yet.' });
  expect(tiles.find(node => node.props.label === 'Average Tenancy').props.metric).toMatchObject({ availability: 'unavailable', value: null });
  await press(tree, 'Average Tenancy: Not available');
  expect(text(tree)).toEqual(expect.arrayContaining(['No reviews yet', 'No accepted rentals with valid start and end dates.', 'No listings, so occupancy cannot be calculated.']));
  expect(tree.root.findAllByType(LineChart).find(node => node.props.title === 'Monthly Occupancy').props.series).toMatchObject({ availability: 'unavailable', points: [] });
});

it('shows property unavailable averages and preserves measured zero counts', async () => {
  useAnalytics.mockReturnValue({ data: {
    ...listingResponse, totalRentalOffers: 0, acceptedOffers: 0, paymentCount: 0, rentCollected: 0,
    acceptanceRate: null, acceptanceRateUnavailableReason: 'No rental records, so the acceptance rate cannot be calculated.',
    averageTenancyMonths: null, averageTenancyUnavailableReason: 'No accepted rentals with valid start and end dates.',
  }, loading: false });
  const tree = await render(ListingAnalyticsScreen);
  const { StatTile, MetricRow } = require('../AnalyticsKit');
  expect(tree.root.findAllByType(StatTile).find(node => node.props.label === 'Rent Recorded').props.metric).toMatchObject({ availability: 'available', value: 0 });
  const rows = tree.root.findAllByType(MetricRow);
  for (const label of ['Acceptance Rate', 'Average Tenancy']) {
    expect(rows.find(node => node.props.label === label).props.metric).toMatchObject({ availability: 'unavailable', value: null });
    await press(tree, `${label}: not available`);
  }
  expect(text(tree)).toEqual(expect.arrayContaining(['No rental records, so the acceptance rate cannot be calculated.', 'No accepted rentals with valid start and end dates.']));
});
