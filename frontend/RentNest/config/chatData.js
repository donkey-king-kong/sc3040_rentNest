import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL } from './api';
import { logChat, newChatRequestId } from './chatDiagnostics';

const FRESH_MS = 30_000;
let session = null;
let summaries = null;
const conversations = new Map();
const inFlight = new Map();

const now = () => Date.now();

const validToken = async () => {
  const token = await AsyncStorage.getItem('token');
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    if (!Number.isFinite(decoded.exp) || decoded.exp * 1000 <= now()) return null;
    return token;
  } catch {
    return null;
  }
};

const resetData = (reason) => {
  summaries = null;
  conversations.clear();
  inFlight.clear();
  logChat(reason === 'logout' ? 'session_cleared' : 'cache_invalidated', {
    operation: 'summaries',
  });
};

const ensureSession = async () => {
  const token = await validToken();
  if (!token) {
    session = null;
    resetData('logout');
    const error = new Error('Sign in again to view chats.');
    error.code = 'UNAUTHENTICATED';
    throw error;
  }
  if (session && session !== token) resetData('session_changed');
  session = token;
  return token;
};

const validateSummaries = (data) => {
  if (!Number.isSafeInteger(data?.currentUserId) || !Array.isArray(data?.chats)) {
    throw new Error('Invalid chat summary response');
  }
  for (const row of data.chats) {
    if (!Number.isSafeInteger(row?.partnerId) || !Number.isSafeInteger(row?.messageID)
        || typeof row?.partnerName !== 'string' || typeof row?.message !== 'string'
        || Number.isNaN(Date.parse(row?.date))) {
      throw new Error('Invalid chat summary response');
    }
  }
  return data;
};

const validateConversation = (data, partnerId) => {
  if (Number(data?.partner?.userID) !== Number(partnerId)
      || typeof data?.partner?.name !== 'string'
      || !Array.isArray(data?.messages)
      || typeof data?.hasMore !== 'boolean') {
    throw new Error('Invalid conversation response');
  }
  return data;
};

const request = async (path, token, operation, signal) => {
  const requestId = newChatRequestId();
  const started = now();
  logChat('request_started', { operation });
  try {
    const response = await axios.get(`${API_BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'X-Chat-Request-Id': requestId,
      },
      timeout: 15_000,
      signal,
    });
    logChat('request_completed', {
      operation,
      durationMs: now() - started,
      httpStatus: response.status,
      rowCount: Array.isArray(response.data?.messages)
        ? response.data.messages.length
        : response.data?.chats?.length,
    });
    return response.data;
  } catch (error) {
    logChat('request_failed', {
      operation,
      durationMs: now() - started,
      httpStatus: error?.response?.status,
    });
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      session = null;
      resetData('logout');
      error.code = 'UNAUTHENTICATED';
    }
    throw error;
  }
};

const cached = (entry) => entry && now() - entry.updatedAt < FRESH_MS;

async function load(key, operation, force, loader) {
  const current = key === 'summaries' ? summaries : conversations.get(key);
  if (!force && cached(current)) {
    logChat('cache_hit', {
      operation,
      cacheAgeMs: now() - current.updatedAt,
      rowCount: current.data.messages?.length ?? current.data.chats?.length,
    });
    return current.data;
  }
  logChat('cache_miss', { operation });
  if (inFlight.has(key)) {
    logChat('request_deduplicated', { operation });
    return inFlight.get(key);
  }
  const promise = loader().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

export const chatData = {
  peekSummaries() {
    return summaries?.data ?? null;
  },

  peekConversation(partnerId) {
    return conversations.get(`conversation:${Number(partnerId)}`)?.data ?? null;
  },

  async loadSummaries({ force = false, signal } = {}) {
    return load('summaries', 'summaries', force, async () => {
      const token = await ensureSession();
      const data = validateSummaries(await request(
        '/api/chathistory/summaries', token, 'summaries', signal,
      ));
      if (await validToken() !== token) throw new Error('Session changed during request');
      summaries = { data, updatedAt: now() };
      return data;
    });
  },

  async loadConversation(partnerId, { beforeMessageId = null, force = false, signal } = {}) {
    const numericPartner = Number(partnerId);
    if (!Number.isSafeInteger(numericPartner) || numericPartner <= 0) {
      throw new Error('Invalid conversation link');
    }
    const key = `conversation:${numericPartner}${beforeMessageId ? `:${beforeMessageId}` : ''}`;
    const operation = beforeMessageId ? 'older_messages' : 'conversation';
    return load(key, operation, force, async () => {
      const token = await ensureSession();
      const cursor = beforeMessageId ? `?beforeMessageId=${Number(beforeMessageId)}` : '';
      const page = validateConversation(await request(
        `/api/chathistory/conversations/${numericPartner}${cursor}`,
        token,
        operation,
        signal,
      ), numericPartner);
      if (await validToken() !== token) throw new Error('Session changed during request');
      const baseKey = `conversation:${numericPartner}`;
      const current = conversations.get(baseKey)?.data;
      const data = beforeMessageId && current
        ? {
            ...page,
            messages: [...page.messages, ...current.messages].filter(
              (message, index, rows) => rows.findIndex(
                candidate => candidate.messageID === message.messageID,
              ) === index,
            ),
          }
        : page;
      conversations.set(baseKey, { data, updatedAt: now() });
      return data;
    });
  },

  invalidate() {
    resetData('mutation');
  },

  clear(reason = 'logout') {
    session = null;
    resetData(reason);
  },
};
