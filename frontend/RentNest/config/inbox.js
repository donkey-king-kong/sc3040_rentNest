import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL, ENDPOINTS } from './api';
import { createInboxStore } from './inboxStore';

export const inboxStore = createInboxStore({
  async readToken() {
    const token = await AsyncStorage.getItem('token');
    if (!token) return null;
    try {
      const { exp } = jwtDecode(token);
      return Number.isFinite(exp) && exp * 1000 > Date.now() ? token : null;
    } catch {
      return null;
    }
  },
  request(token, signal, requestId) {
    return axios.get(`${API_BASE_URL}${ENDPOINTS.INBOX}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Inbox-Request-Id': requestId },
      timeout: 15000,
      signal,
    });
  },
});
