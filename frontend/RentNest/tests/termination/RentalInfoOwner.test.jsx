import React from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { act } from 'react-test-renderer';
import { AppState } from 'react-native';
import RentalInfoOwner from '../../app/RentalInfoOwnerScreen';
import { rentalDetailCache, detailKey } from '../../config/rentalDetails';
import { inboxStore } from '../../config/inbox';
import { render, text, button, press, deferred, httpError } from './helpers';

const listing = { listingID: 59, ownerId: 11, tenantId: 22,
  name: 'Property', tenantName: 'Tenant', ownerName: 'Owner', price: 3000 };
let router;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  rentalDetailCache.clear();
  router = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
  useRouter.mockReturnValue(router);
  useLocalSearchParams.mockReturnValue({ listingId: '59' });
  AsyncStorage.getItem.mockResolvedValue('token');
  jwtDecode.mockReturnValue({ exp: Date.now() / 1000 + 3600 });
  axios.get.mockResolvedValue({ status: 200, data: listing });
});

test('one scoped request loads the property and routes to its tenant', async () => {
  const ui = await render(<RentalInfoOwner />);
  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(axios.get.mock.calls[0][0]).toBe('https://rentnest.test/api/owner/listings/59/rental-info');
  await press(ui, 'Manage tenant Tenant');
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/TenantOverview', params: { tenantId: 22, listingId: 59 },
  });
});

test('Back remains available during a pending request', async () => {
  const pending = deferred();
  axios.get.mockReturnValue(pending.promise);
  const ui = await render(<RentalInfoOwner />);
  expect(text(ui.toJSON())).toContain('Loading rental info...');
  await press(ui, 'Go back');
  expect(router.back).toHaveBeenCalled();
});

test('warm cache still uses the standard transition while revalidating', async () => {
  await rentalDetailCache.resource('property:59').refresh();
  const pending = deferred();
  axios.get.mockReturnValue(pending.promise);
  const ui = await render(<RentalInfoOwner />);
  expect(text(ui.toJSON())).toContain('Loading rental info...');
  expect(text(ui.toJSON())).not.toContain('Showing saved details');
  await act(async () => pending.resolve({ status: 200, data: listing }));
  expect(text(ui.toJSON())).toContain('Manage Tenant');
});

test('vacant properties display an explicit no-tenant state', async () => {
  axios.get.mockResolvedValue({ status: 200, data: { ...listing, tenantId: null } });
  const ui = await render(<RentalInfoOwner />);
  expect(text(ui.toJSON())).toContain('No current tenant');
});

test('saved data remains visible on failure but management stays disabled until retry', async () => {
  await rentalDetailCache.resource('property:59').refresh();
  axios.get.mockRejectedValue(httpError(500));
  const ui = await render(<RentalInfoOwner />);
  expect(text(ui.toJSON())).toContain('Showing saved details');
  expect(button(ui, 'Manage tenant Tenant').props.disabled).toBe(true);
  expect(button(ui, 'Edit Listing').props.disabled).toBe(true);
  axios.get.mockResolvedValue({ status: 200, data: listing });
  await press(ui, 'Retry');
  expect(button(ui, 'Edit Listing').props.disabled).toBe(false);
});

test('changing route cannot display the previous property response', async () => {
  const pending = deferred();
  axios.get.mockReturnValueOnce(pending.promise);
  const ui = await render(<RentalInfoOwner />);
  useLocalSearchParams.mockReturnValue({ listingId: '60' });
  axios.get.mockResolvedValue({ status: 200, data: { ...listing, listingID: 60, name: 'Next Property' } });
  await act(async () => ui.update(<RentalInfoOwner />));
  await act(async () => pending.resolve({ status: 200, data: listing }));
  expect(text(ui.toJSON())).toContain('Next Property');
});

test('missing token redirects to login without requesting private data', async () => {
  AsyncStorage.getItem.mockResolvedValue(null);
  await render(<RentalInfoOwner />);
  expect(router.replace).toHaveBeenCalledWith('/LoginScreen');
  expect(axios.get).not.toHaveBeenCalled();
});

test('foreground revalidates the visible property', async () => {
  await render(<RentalInfoOwner />);
  const listener = AppState.addEventListener.mock.calls.at(-1)[1];
  await act(async () => listener('active'));
  expect(axios.get).toHaveBeenCalledTimes(2);
});

test.each(['clear', 'invalidate'])('Inbox %s also removes cached rental details', async method => {
  const resource = rentalDetailCache.resource('property:59');
  await resource.refresh();
  expect(resource.getSnapshot().data).toEqual(listing);
  inboxStore[method]();
  expect(resource.getSnapshot().data).toBeNull();
});

test.each([undefined, '', '0', '-1', 'NaN', ['59'], '9007199254740992'])(
  'invalid route ID %j never generates an endpoint', value => {
    expect(detailKey('property', value)).toBeNull();
  });
