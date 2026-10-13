import React from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { act } from 'react-test-renderer';
import TenantOverview from '../../app/TenantOverview';
import { rentalDetailCache, validateDetail } from '../../config/rentalDetails';
import { render, text, buttons, button, press, deferred, httpError } from './helpers';

jest.mock('../../config/api', () => ({
  API_BASE_URL: 'https://rentnest.test',
  ENDPOINTS: {
    RENTALS: '/api/rentals',
    TENANT_PAYMENTS: (listing, tenant) => `/api/payment/tenant-payments/${listing}/${tenant}`,
    OUTSTANDING_PAYMENTS: rental => `/api/payment/outstandingPayments/${rental}`,
  },
}));

let rental, router;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  rentalDetailCache.clear();
  rental = { rentalID: 82, listingId: 59, status: 'active', tenantUserID: 22,
    ownerUserId: 11, rentalPrice: 3000, tenantName: 'Tenant', leaseExpiry: '2027-10-01' };
  router = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
  useRouter.mockReturnValue(router);
  useLocalSearchParams.mockReturnValue({ tenantId: '22', listingId: '59' });
  AsyncStorage.getItem.mockResolvedValue('token');
  jwtDecode.mockReturnValue({ sub: 'owner@example.test', exp: Date.now() / 1000 + 3600 });
  axios.get.mockImplementation(async url => {
    if (url.endsWith('/tenants/22')) return { status: 200, data: rental };
    if (url.endsWith('/rentals/82/payments')) return { status: 200, data: {
      rentalID: 82, rentalPrice: 3000, payments: [], outstandingMonths: [], totalOutstandingAmount: 0,
    } };
    throw new Error(url);
  });
});

test.each(['changed tenant', 'terminated', 'pending', 'different owner'])(
  'server-rejected %s tenancy never exposes termination', async () => {
  axios.get.mockRejectedValue(httpError(404));
  const ui = await render(<TenantOverview />);
  expect(text(ui.toJSON())).toContain('no longer available');
  expect(buttons(ui).map(text)).not.toContain('Terminate Lease');
  expect(axios.get).toHaveBeenCalledTimes(1);
});

test('matching active tenancy opens termination with the current rental ID', async () => {
  const ui = await render(<TenantOverview />);
  await press(ui, 'Terminate Lease');
  expect(router.push).toHaveBeenCalledWith({ pathname: '/TerminateLease', params: { rentalId: 82 } });
  expect(axios.get).toHaveBeenCalledTimes(2);
});

test('standard loader keeps Back available while tenant information is pending', async () => {
  const pending = deferred();
  axios.get.mockReturnValue(pending.promise);
  const ui = await render(<TenantOverview />);
  expect(text(ui.toJSON())).toContain('Loading tenant information...');
  expect(text(ui.toJSON())).not.toContain('Tenant Overview');
  await press(ui, 'Go back');
  expect(router.back).toHaveBeenCalled();
  await act(async () => pending.reject(httpError(404)));
});

test('profile and Back work before the financial request finishes', async () => {
  const pending = deferred();
  axios.get.mockImplementation(url => url.endsWith('/tenants/22')
    ? Promise.resolve({ status: 200, data: rental }) : pending.promise);
  const ui = await render(<TenantOverview />);
  expect(text(ui.toJSON())).toContain('Lease expires on');
  expect(text(ui.toJSON())).toContain('Loading payments...');
  expect(text(ui.toJSON())).not.toContain('No outstanding payments');
  await press(ui, 'Go back');
  expect(router.back).toHaveBeenCalled();
  await act(async () => pending.resolve({ status: 200, data: {
    rentalID: 82, rentalPrice: 3000, payments: [], outstandingMonths: ['2026-10-01'],
    totalOutstandingAmount: 3000,
  } }));
  expect(text(ui.toJSON())).toContain('Payment Pending');
});

test('payment failure has its own retry and does not imply zero outstanding', async () => {
  axios.get.mockImplementation(async url => {
    if (url.endsWith('/tenants/22')) return { status: 200, data: rental };
    throw httpError(500);
  });
  const ui = await render(<TenantOverview />);
  expect(text(ui.toJSON())).toContain('Retry payments');
  expect(text(ui.toJSON())).not.toContain('No outstanding payments');
  expect(text(ui.toJSON())).toContain('Lease expires on');
  axios.get.mockResolvedValue({ status: 200, data: {
    rentalID: 82, rentalPrice: 3000, payments: [], outstandingMonths: [], totalOutstandingAmount: 0,
  } });
  await press(ui, 'Retry payments');
  expect(text(ui.toJSON())).toContain('No outstanding payments');
  expect(axios.get).toHaveBeenCalledTimes(3);
});

test('cached summary stays behind the standard loader until revalidation', async () => {
  await rentalDetailCache.resource('summary:59:22').refresh();
  const pending = deferred();
  axios.get.mockReturnValue(pending.promise);
  const ui = await render(<TenantOverview />);
  expect(text(ui.toJSON())).toContain('Loading tenant information...');
  expect(text(ui.toJSON())).not.toContain('Showing saved tenant details');
  expect(buttons(ui).map(text)).not.toContain('Terminate Lease');
  await act(async () => pending.reject(httpError(404)));
  expect(buttons(ui).map(text)).not.toContain('Terminate Lease');
});

test('payment authorization loss disables sensitive actions', async () => {
  axios.get.mockImplementation(async url => {
    if (url.endsWith('/tenants/22')) return { status: 200, data: rental };
    throw httpError(404);
  });
  const ui = await render(<TenantOverview />);
  expect(button(ui, 'Terminate Lease').props.disabled).toBe(true);
  expect(button(ui, 'Leave Review').props.disabled).toBe(true);
});

test('manual refresh revalidates the summary and fetches payments once', async () => {
  const ui = await render(<TenantOverview />);
  await press(ui, 'Refresh tenant information');
  expect(axios.get).toHaveBeenCalledTimes(4);
});

test.each([{ tenantUserID: 33 }, { status: 'terminated' }, { status: 'pending' }, { listingId: 60 }])(
  'malformed or stale summary contracts are rejected: %j', change => {
    expect(() => validateDetail('summary:59:22', { ...rental, ...change })).toThrow();
  });
