import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_PORT = '8080';

const getExpoHost = () => {
    const hostUri =
        Constants.expoConfig?.hostUri ||
        Constants.manifest2?.extra?.expoClient?.hostUri ||
        Constants.manifest?.debuggerHost;

    return hostUri?.split(':')[0];
};

const getApiBaseUrl = () => {
    if (process.env.EXPO_PUBLIC_API_BASE_URL) {
        return process.env.EXPO_PUBLIC_API_BASE_URL;
    }

    if (Platform.OS === 'web') {
        return `http://${window.location.hostname}:${BACKEND_PORT}`;
    }

    if (Platform.OS === 'android') {
        return `http://10.0.2.2:${BACKEND_PORT}`;
    }

    const expoHost = getExpoHost();
    return `http://${expoHost || 'localhost'}:${BACKEND_PORT}`;
};

export const API_BASE_URL = getApiBaseUrl();

export const ENDPOINTS = {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    LISTINGS: "/api/listings",
    RENTALS: '/api/rentals',
    PAYMENTS: '/api/payment',
    PAYMENTS_BY_RENTAL: (rentalId) => `/api/payment/paymentsList/${rentalId}`,
    OUTSTANDING_PAYMENTS: (rentalId) => `/api/payment/outstandingPayments/${rentalId}`,
    TENANT_PAYMENTS: (listingId, tenantId) => `/api/payment/tenant-payments/${listingId}/${tenantId}`,
    REVIEWS: '/api/reviews',
    REVIEW_BY_ID: (id) => `/api/reviews/${id}`,
    ANALYTICS_OWNER_SUMMARY: '/api/analytics/owner/summary',
    ANALYTICS_OWNER_LISTING: (listingId) => `/api/analytics/owner/listings/${listingId}`,
    ANALYTICS_ADMIN_SUMMARY: '/api/analytics/admin/summary',
    // Add other endpoints here as needed
};
