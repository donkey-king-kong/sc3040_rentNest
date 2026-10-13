import React from 'react';
import { act, create } from 'react-test-renderer';
import { FlatList, Text } from 'react-native';
import InboxScreen from '../../app/InboxScreen';
import { inboxStore } from '../../config/inbox';

const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockRequest = jest.fn();
let mockToken = 'session-a';
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: effect => require('react').useEffect(effect, [effect]),
}));
jest.mock('../../config/inbox', () => {
  const { createInboxStore } = require('../../config/inboxStore');
  return { inboxStore: createInboxStore({
    readToken: async () => mockToken,
    request: (...args) => mockRequest(...args),
    log: () => {},
  }) };
});
jest.mock('../NavigationBar', () => 'NavigationBar');
jest.mock('../MorphingInfinity', () => 'MorphingInfinity');
jest.mock('../ListingImage', () => 'ListingImage');

const owner = { listingID: 1, name: 'Owned home', location: 'Location', listingpicture: null, role: 'Owner', ownerId: 5, tenantId: null };
const tenant = { ...owner, listingID: 2, name: 'Rented home', role: 'Tenant', tenantId: 5 };
let tree;
beforeEach(() => {
  jest.clearAllMocks();
  inboxStore.clear('login');
  mockToken = 'session-a';
  mockRequest.mockResolvedValue({ status: 200, data: [owner, tenant] });
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = null; });
const render = async () => { await act(async () => { tree = create(<InboxScreen />); }); };
const text = value => tree.root.findAllByType(Text).some(node => node.props.children === value);

it('loads one request, retains both destinations and passes tenant navigation IDs', async () => {
  await render();
  expect(mockRequest).toHaveBeenCalledTimes(1);
  const list = tree.root.findByType(FlatList);
  await act(async () => list.props.renderItem({ item: owner }).props.onPress());
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/RentalInfoOwnerScreen', params: { listingId: 1 } });
  await act(async () => list.props.renderItem({ item: tenant }).props.onPress());
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/RentalInfoTenantScreen', params: { listingId: 2, tenantId: 5 } });
});

it('keeps navigation accessible on initial loading', async () => {
  mockRequest.mockImplementation(() => new Promise(() => {}));
  await render();
  expect(text('Loading inbox...')).toBe(true);
  expect(tree.root.findAllByType('NavigationBar')).toHaveLength(1);
});

it('uses the standard transition for warm-cache focus refresh then restores cards on failure', async () => {
  await inboxStore.refresh();
  let reject;
  mockRequest.mockImplementation(() => new Promise((_, no) => { reject = no; }));
  await render();
  expect(text('Loading inbox...')).toBe(true);
  expect(tree.root.findAllByType(FlatList)).toHaveLength(0);
  expect(tree.root.findAllByType('NavigationBar')).toHaveLength(1);
  await act(async () => { reject({ code: 'ERR_NETWORK' }); });
  expect(tree.root.findByType(FlatList).props.data).toHaveLength(2);
  expect(text('Retry')).toBe(true);
});

it('does not label a failed first request as an empty inbox and supports Retry', async () => {
  mockRequest.mockRejectedValueOnce({ code: 'ERR_NETWORK' });
  await render();
  expect(tree.root.findByType(FlatList).props.ListEmptyComponent).toBeNull();
  mockRequest.mockResolvedValue({ status: 200, data: [] });
  const retry = tree.root.findAll(node => typeof node.props.onPress === 'function'
    && node.findAllByType(Text).some(child => child.props.children === 'Retry'))[0];
  await act(async () => retry.props.onPress());
  expect(mockRequest).toHaveBeenCalledTimes(2);
  expect(text('No active rentals')).toBe(true);
});

it('clears all cards and redirects after authentication failure', async () => {
  await inboxStore.refresh();
  mockRequest.mockRejectedValue({ response: { status: 403 } });
  await render();
  expect(inboxStore.getSnapshot().data).toBeNull();
  expect(mockRouter.replace).toHaveBeenCalledWith('/LoginScreen');
});

it('manual refresh uses the same deduplicated request path', async () => {
  await render();
  await act(async () => {
    const refresh = tree.root.findAll(node => node.props.accessibilityLabel === 'Refresh inbox'
      && typeof node.props.onPress === 'function')[0];
    refresh.props.onPress();
    tree.root.findByType(FlatList).props.onRefresh();
  });
  expect(mockRequest).toHaveBeenCalledTimes(2);
});
