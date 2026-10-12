import React from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { useLocalSearchParams, useRouter } from 'expo-router';
import TenantOverview from '../../app/TenantOverview';
import { render, text, buttons, press } from './helpers';

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
  rental = { rentalID: 82, status: 'active', tenantUserID: 22, ownerUserId: 11, rentalPrice: 3000 };
  router = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
  useRouter.mockReturnValue(router);
  useLocalSearchParams.mockReturnValue({ tenantId: '22', listingId: '59' });
  AsyncStorage.getItem.mockResolvedValue('token');
  jwtDecode.mockReturnValue({ sub: 'owner@example.test' });
  axios.get.mockImplementation(async url => {
    if (url.includes('/api/users/id/')) return { data: { userID: 22, name: 'Tenant' } };
    if (url.includes('/api/users/')) return { data: { userID: 11 } };
    if (url.includes('/api/rentals/')) return { data: rental };
    if (url.includes('/tenant-payments/')) return { data: { payments: [] } };
    if (url.includes('/outstandingPayments/')) return { data: { 'Outstanding Months': [] } };
    throw new Error(url);
  });
});

test.each([
  { tenantUserID: 33 },
  { status: 'terminated' },
  { status: 'pending' },
  { ownerUserId: 44 },
])('stale or mismatched tenancy never exposes termination: %j', async change => {
  rental = { ...rental, ...change };
  const ui = await render(<TenantOverview />);
  expect(text(ui.toJSON())).toContain('no longer the active tenancy');
  expect(buttons(ui).map(text)).not.toContain('Terminate Lease');
  expect(axios.get.mock.calls.some(([url]) => url.includes('/api/payment/'))).toBe(false);
});

test('matching active tenancy opens termination with the current rental ID', async () => {
  const ui = await render(<TenantOverview />);
  await press(ui, 'Terminate Lease');
  expect(router.push).toHaveBeenCalledWith({ pathname: '/TerminateLease', params: { rentalId: 82 } });
});
