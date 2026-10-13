import { logRentalDetail, newRentalRequestId } from './rentalDetailDiagnostics.js';

const empty = () => ({ data: null, loading: false, error: null, status: null,
  unauthenticated: false, updatedAt: null, stale: true });

export function createRentalDetailCache({ readToken, request, validate, log = logRentalDetail, now = Date.now }) {
  const entries = new Map();
  let session = null;
  const publish = (entry, patch) => {
    entry.state = { ...entry.state, ...patch };
    entry.listeners.forEach(listener => listener());
  };
  const cancel = entry => {
    const flight = entry.flight;
    entry.flight = null;
    flight?.controller.abort();
  };
  const reset = (reason, unauthenticated = false, except = null) => {
    for (const entry of entries.values()) {
      if (entry !== except) cancel(entry);
      publish(entry, { ...empty(), unauthenticated });
    }
    log(reason === 'mutation' ? 'cache_invalidated' : 'session_cleared', { reason });
  };
  const cache = {
    clear(reason = 'logout') { session = null; reset(reason); },
    invalidate() { reset('mutation'); },
    resource(key) {
      if (entries.has(key)) return entries.get(key).api;
      // Bound inactive navigation history without evicting mounted screens or pending requests.
      if (entries.size >= 32) {
        for (const [oldKey, old] of entries) {
          if (!old.listeners.size && !old.flight) {
            entries.delete(oldKey);
            if (entries.size < 32) break;
          }
        }
      }
      const entry = { state: empty(), flight: null, listeners: new Set() };
      const operation = key.split(':')[0];
      entry.api = {
        getSnapshot: () => entry.state,
        subscribe(listener) {
          entry.listeners.add(listener);
          return () => entry.listeners.delete(listener);
        },
        cancel() {
          cancel(entry);
          publish(entry, { loading: false, stale: true });
          log('request_cancelled', { operation });
        },
        refresh(reason = 'focus') {
          if (entry.flight) {
            log('request_deduplicated', { operation, requestId: entry.flight.id });
            return entry.flight.promise;
          }
          const flight = { id: newRentalRequestId(), controller: new AbortController() };
          entry.flight = flight;
          // Set stale before reading storage so actions cannot use yesterday's authorization.
          publish(entry, { loading: true, stale: true, error: null });
          flight.promise = (async () => {
            const start = now();
            try {
              const token = await readToken();
              if (entry.flight !== flight) return null;
              if (!token) {
                session = null;
                reset('auth_failure', true);
                return null;
              }
              if (session !== token) {
                if (session !== null) reset('session_changed', false, entry);
                session = token;
                publish(entry, { loading: true });
              }
              log(entry.state.data ? 'cache_hit' : 'cache_miss', {
                operation, requestId: flight.id,
                ...(entry.state.updatedAt === null ? {} : { cacheAgeMs: Math.max(0, now() - entry.state.updatedAt) }),
              });
              log('request_started', { operation, requestId: flight.id, reason });
              const response = await request(key, token, flight.controller.signal, flight.id);
              if (entry.flight !== flight) {
                log('response_discarded', { operation, requestId: flight.id });
                return null;
              }
              const currentToken = await readToken();
              if (entry.flight !== flight) return null;
              if (token !== currentToken) {
                session = null;
                reset('session_changed', !currentToken);
                return null;
              }
              validate(key, response.data);
              publish(entry, { data: response.data, loading: false, stale: false, error: null,
                status: response.status, updatedAt: now(), unauthenticated: false });
              log('request_completed', { operation, requestId: flight.id,
                durationMs: now() - start, httpStatus: response.status });
              return response.data;
            } catch (error) {
              if (entry.flight !== flight) return null;
              const status = error?.response?.status;
              log('request_failed', { operation, requestId: flight.id, durationMs: now() - start,
                httpStatus: status, errorCode: error?.code });
              if (status === 401 || status === 403) {
                session = null;
                reset('auth_failure', true);
              } else {
                const unavailable = status === 404 || status === 409;
                publish(entry, { loading: false, stale: true, status,
                  ...(unavailable ? { data: null, updatedAt: null } : {}),
                  error: unavailable ? 'This property or active tenancy is no longer available. Return to the property to view its current tenant.'
                    : 'Could not refresh this section. Check your connection and try again.' });
              }
              return null;
            } finally {
              if (entry.flight === flight) entry.flight = null;
            }
          })();
          return flight.promise;
        },
      };
      entries.set(key, entry);
      return entry.api;
    },
  };
  return cache;
}
