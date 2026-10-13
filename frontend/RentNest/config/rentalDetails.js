import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL } from './api';
import { createRentalDetailCache } from './rentalDetailStore';

const id = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
export const detailKey = (operation, ...ids) =>
  ids.every(value => !Array.isArray(value) && id(value)) ? `${operation}:${ids.map(Number).join(':')}` : null;

export function validateDetail(key, data) {
  const [operation, first, second] = key.split(':');
  let valid = data && typeof data === 'object';
  if (operation === 'property') valid = valid && data.listingID === Number(first) && id(data.ownerId)
    && (data.tenantId === null || id(data.tenantId));
  else if (operation === 'summary') valid = valid && data.listingId === Number(first)
    && data.tenantUserID === Number(second) && data.status === 'active' && id(data.rentalID)
    && id(data.ownerUserId) && Number.isSafeInteger(data.rentalPrice) && data.rentalPrice > 0
    && validDate(data.leaseExpiry);
  else if (operation === 'payments') valid = valid && data.rentalID === Number(first)
    && Number.isSafeInteger(data.rentalPrice) && data.rentalPrice > 0
    && Array.isArray(data.payments) && data.payments.every(row => id(row.paymentID)
      && Number.isSafeInteger(row.amount) && validDate(row.date))
    && Array.isArray(data.outstandingMonths) && data.outstandingMonths.every(validDate)
    && Number.isSafeInteger(data.totalOutstandingAmount) && data.totalOutstandingAmount >= 0;
  else valid = false;
  if (!valid) throw Object.assign(new Error('Invalid detail response'), { code: 'INVALID_DETAIL_RESPONSE' });
}

export const rentalDetailCache = createRentalDetailCache({
  async readToken() {
    const token = await AsyncStorage.getItem('token');
    if (!token) return null;
    try {
      const { exp } = jwtDecode(token);
      return Number.isFinite(exp) && exp * 1000 > Date.now() ? token : null;
    } catch { return null; }
  },
  request(key, token, signal, requestId) {
    const [operation, first, second] = key.split(':');
    const endpoint = operation === 'property' ? `/api/owner/listings/${first}/rental-info`
      : operation === 'summary' ? `/api/owner/listings/${first}/tenants/${second}`
        : `/api/owner/rentals/${first}/payments`;
    return axios.get(API_BASE_URL + endpoint, {
      headers: { Authorization: `Bearer ${token}`, 'X-Rental-Request-Id': requestId },
      signal, timeout: 15000,
    });
  },
  validate: validateDetail,
});
