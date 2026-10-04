import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import OwnerAnalyticsScreen from '../../../app/OwnerAnalyticsScreen';
import AdminAnalyticsScreen from '../../../app/AdminAnalyticsScreen';
import ListingAnalyticsScreen from '../../../app/ListingAnalyticsScreen';
import { useAnalytics, useOwnedListings } from '../AnalyticsKit';
import listingResponse from './fixtures/listing-response.json';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack, canGoBack: mockCanGoBack, setParams: jest.fn() }),
  useLocalSearchParams: () => ({ listingId: '2' }),
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
  mockCanGoBack.mockReturnValue(true);
  useAnalytics.mockReturnValue({ data: listingResponse, loading: false });
  useOwnedListings.mockReturnValue({ loading: false, items: [{ listingID: 2, name: 'A2', type: 'Apartment', location: 'Singapore' }] });
});

it('owner navigation separates topics, retains the period and still opens property analytics', async () => {
  const tree = await render(OwnerAnalyticsScreen);
  expect(text(tree)).toContain('At a glance');
  expect(text(tree)).not.toContain('Monthly rent recorded');
  await press(tree, '30D period');
  await press(tree, 'Rent tab');
  expect(text(tree)).toContain('Monthly rent recorded');
  expect(text(tree)).not.toContain('Reviews');
  expect(useAnalytics).toHaveBeenLastCalledWith('/owner', '30D');
  await press(tree, 'Occupancy tab');
  expect(text(tree)).toContain('Occupancy trend');
  expect(text(tree)).not.toContain('Monthly rent recorded');
  await press(tree, 'Offers tab');
  expect(text(tree)).toContain('Offers (all time)');
  expect(text(tree)).toContain('Tenancy length');
  await press(tree, 'Properties tab');
  expect(text(tree)).toContain('By property');
  expect(text(tree)).not.toContain('Offers (all time)');
  await press(tree, 'View analytics for A2');
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/ListingAnalyticsScreen', params: { listingId: 2 } });
  await press(tree, 'Overview tab');
  expect(useAnalytics).toHaveBeenLastCalledWith('/owner', '30D');
});

it('admin navigation exposes rental, user and safety sections without stacking them', async () => {
  const tree = await render(AdminAnalyticsScreen);
  expect(text(tree)).toContain('Monthly rent recorded');
  expect(text(tree)).not.toContain('Moderation and safety');
  await press(tree, 'Rentals tab');
  expect(text(tree)).toContain('Rental activity in this period');
  expect(text(tree)).toContain('Rentals (all time)');
  await press(tree, 'Users tab');
  expect(text(tree)).toContain('User distribution');
  expect(text(tree)).not.toContain('Rentals (all time)');
  await press(tree, 'Safety tab');
  expect(text(tree)).toContain('Moderation and safety');
  expect(text(tree)).toContain('Flagged items by type');
  expect(text(tree)).toContain('Not yet available');
  await press(tree, 'Back to admin');
  expect(mockReplace).toHaveBeenCalledWith('/AdminScreen');
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
  await press(tree, 'Payments tab');
  expect(text(tree)).toContain('Payments recorded');
  expect(text(tree)).not.toContain('Time to accepted offer');
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
