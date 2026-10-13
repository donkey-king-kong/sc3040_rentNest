import { logInbox, newInboxRequestId } from './inboxDiagnostics.js';

const emptyState = () => ({
  data: null, loading: false, error: null, unauthenticated: false, updatedAt: null,
});

function validateRows(data) {
  if (!Array.isArray(data) || data.some(row =>
    !row || !Number.isSafeInteger(row.listingID) || row.listingID <= 0 ||
    !Number.isSafeInteger(row.ownerId) ||
    (row.tenantId !== null && !Number.isSafeInteger(row.tenantId)) ||
    !['Owner', 'Tenant'].includes(row.role) ||
    (row.role === 'Tenant' && row.tenantId === null) ||
    ['name', 'location', 'listingpicture'].some(key => row[key] !== null && typeof row[key] !== 'string')
  )) {
    throw Object.assign(new Error('Invalid inbox response'), { code: 'INVALID_INBOX_RESPONSE' });
  }
  return data;
}

export function createInboxStore({ readToken, request, log = logInbox, now = Date.now }) {
  let state = emptyState();
  let token = null;
  let flight = null;
  const listeners = new Set();
  const publish = next => {
    state = next;
    listeners.forEach(listener => listener());
  };
  const cancel = () => {
    const previous = flight;
    flight = null;
    previous?.controller.abort();
  };

  const store = {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clear(reason = 'logout') {
      cancel();
      token = null;
      publish(emptyState());
      log('session_cleared', { reason });
    },
    invalidate() {
      cancel();
      publish(emptyState());
      log('cache_invalidated', { reason: 'mutation' });
    },
    refresh(reason = 'focus') {
      if (flight) {
        log('request_deduplicated', { requestId: flight.id, reason });
        return flight.promise;
      }
      const attempt = { id: newInboxRequestId(), controller: new AbortController() };
      flight = attempt;
      attempt.promise = (async () => {
        const start = now();
        try {
          const storedToken = await readToken();
          if (flight !== attempt) return;
          if (!storedToken) {
            token = null;
            publish({ ...emptyState(), unauthenticated: true });
            log('session_cleared', { reason: 'auth_failure' });
            return;
          }
          if (token !== storedToken) {
            token = storedToken;
            publish(emptyState());
          }
          log(state.data === null ? 'cache_miss' : 'cache_hit', {
            requestId: attempt.id, reason,
            ...(state.updatedAt === null ? {} : { cacheAgeMs: Math.max(0, now() - state.updatedAt) }),
          });
          publish({ ...state, loading: true, error: null, unauthenticated: false });
          log('request_started', { requestId: attempt.id, reason });
          const response = await request(storedToken, attempt.controller.signal, attempt.id);
          if (flight !== attempt) {
            log('response_discarded', { requestId: attempt.id });
            return;
          }
          // Storage can change while a request is in flight, even without an explicit clear.
          if (await readToken() !== storedToken) {
            if (flight === attempt) store.clear('auth_failure');
            log('response_discarded', { requestId: attempt.id });
            return;
          }
          if (flight !== attempt) return;
          const rows = validateRows(response.data);
          publish({ ...emptyState(), data: rows, updatedAt: now() });
          log('request_completed', {
            requestId: attempt.id, durationMs: Math.max(0, now() - start),
            rows: rows.length, httpStatus: response.status,
          });
        } catch (error) {
          if (flight !== attempt) return;
          const status = error?.response?.status;
          const unauthenticated = status === 401 || status === 403;
          if (unauthenticated) token = null;
          publish({
            ...(unauthenticated ? emptyState() : state),
            loading: false, unauthenticated,
            error: unauthenticated ? 'Please log in again.' : 'Could not refresh your inbox. Check your connection and try again.',
          });
          log('request_failed', {
            requestId: attempt.id, durationMs: Math.max(0, now() - start),
            httpStatus: status, errorCode: error?.code,
          });
          if (unauthenticated) log('session_cleared', { reason: 'auth_failure' });
        } finally {
          if (flight === attempt) flight = null;
        }
      })();
      return attempt.promise;
    },
  };
  return store;
}
