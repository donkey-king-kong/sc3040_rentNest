import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import axios from 'axios';
import HomeListingScreen from '../../app/HomeListingScreen';

const mockRouter = { back: jest.fn(), push: jest.fn(), replace: jest.fn() };
let tree;
let corePending;
let secondaryPending;
let pricingPending;

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ listingId: '59' }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => 'test-token'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock('jwt-decode', () => ({
  jwtDecode: () => ({ sub: 'viewer@example.test' }),
}));
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(async () => ({ status: 200 })),
  put: jest.fn(),
}));
jest.mock('../AppMap', () => ({
  __esModule: true,
  default: 'MapView',
  Marker: 'Marker',
}));
jest.mock('../ListingImage', () => 'ListingImage');
jest.mock('../ProfileImage', () => 'ProfileImage');
jest.mock('../MorphingInfinity', () => 'MorphingInfinity');
jest.mock('../PriceInsightsChart', () => 'PriceInsightsChart');
jest.mock('../FairPriceCard', () => 'FairPriceCard');
jest.mock('../../config/pricingDiagnostics', () => ({
  startPricingRequestLog: () => ({ completed: jest.fn(), failed: jest.fn() }),
}));

const listing = {
  listingID: 59,
  name: 'Fast property',
  location: 'Test street',
  price: 3000,
  postal: 123456,
  type: 'HDB',
  description: 'Whole unit',
  beds: 3,
  bathroom: 2,
  size: 900,
  ownerId: 11,
  ownerName: 'Owner',
  listingpicture: null,
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

const isUser = url => url.includes('/api/users/viewer%40example.test')
  || url.includes('/api/users/viewer@example.test');
const isListing = url => url.endsWith('/api/listings/59');
const isPricing = url => url.includes('/api/pricing/listing/59');

beforeEach(() => {
  jest.clearAllMocks();
  corePending = null;
  secondaryPending = deferred();
  pricingPending = deferred();
  axios.get.mockImplementation(url => {
    if (isUser(url)) return Promise.resolve({ status: 200, data: { userID: 22 } });
    if (isListing(url)) return corePending?.promise || Promise.resolve({ status: 200, data: listing });
    if (isPricing(url)) return pricingPending.promise;
    if (url.includes('/api/gov/') || url.includes('/api/reviews/')) return secondaryPending.promise;
    throw new Error(`Unexpected GET: ${url}`);
  });
});

afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  tree = null;
});

const render = async () => {
  await act(async () => { tree = create(<HomeListingScreen />); });
};

const hasText = value => tree.root.findAllByType(Text)
  .some(node => node.props.children === value);

it('does not show Back while core listing data is loading', async () => {
  corePending = deferred();
  await render();
  expect(hasText('Loading listing...')).toBe(true);
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Go back')).toHaveLength(0);
});

it('waits for pricing and secondary requests before displaying the listing', async () => {
  await render();
  expect(hasText('Fast property')).toBe(false);
  expect(hasText('Loading listing...')).toBe(true);
  const pricingCalls = axios.get.mock.calls.filter(([url]) => isPricing(url));
  expect(pricingCalls).toHaveLength(2);
  pricingCalls.forEach(([, config]) => expect(config.timeout).toBe(25_000));
  await act(async () => {
    pricingPending.resolve({ status: 200, data: { available: true } });
    secondaryPending.resolve({ status: 200, data: [] });
  });
  expect(hasText('Fast property')).toBe(true);
  expect(hasText('Loading listing...')).toBe(false);
  expect(tree.root.findByType('FairPriceCard').props.loading).toBe(false);
});

it('keeps the loaded-screen Back control outside scrolling content', async () => {
  await render();
  await act(async () => {
    pricingPending.resolve({ status: 200, data: { available: true } });
    secondaryPending.resolve({ status: 200, data: [] });
  });

  const back = tree.root.find(node => node.props.accessibilityLabel === 'Go back');
  let ancestor = back.parent;
  while (ancestor) {
    expect(ancestor.type).not.toBe('ScrollView');
    ancestor = ancestor.parent;
  }

  await act(async () => back.props.onPress());
  expect(mockRouter.back).toHaveBeenCalled();
});

it('exposes a retry after pricing fails', async () => {
  pricingPending.promise.catch(() => {});
  await render();
  await act(async () => {
    secondaryPending.resolve({ status: 200, data: [] });
    pricingPending.reject({ response: { status: 503 } });
  });
  const card = tree.root.findByType('FairPriceCard');
  expect(card.props.estimate.available).toBe(false);
  pricingPending = deferred();
  await act(async () => card.props.onRetry());
  expect(axios.get.mock.calls.filter(([url]) => isPricing(url))).toHaveLength(4);
});

it('shows actionable retry copy when the cold pricing request times out', async () => {
  pricingPending.promise.catch(() => {});
  await render();
  await act(async () => {
    secondaryPending.resolve({ status: 200, data: [] });
    pricingPending.reject({ code: 'ECONNABORTED' });
  });
  const card = tree.root.findByType('FairPriceCard');
  expect(card.props.estimate).toEqual({
    available: false,
    message: 'Pricing is taking longer than expected. Retry pricing; the result may be ready now.',
  });
  expect(card.props.onRetry).toEqual(expect.any(Function));
});
