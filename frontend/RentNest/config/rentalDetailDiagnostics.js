let sequence = 0;
const events = new Set(['request_started', 'request_completed', 'request_failed', 'request_deduplicated',
  'response_discarded', 'cache_hit', 'cache_miss', 'cache_invalidated', 'session_cleared', 'request_cancelled']);
const operations = new Set(['property', 'summary', 'payments']);
const reasons = new Set(['focus', 'manual', 'login', 'logout', 'mutation', 'auth_failure', 'session_changed']);
const codes = new Set(['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ERR_BAD_REQUEST', 'ERR_BAD_RESPONSE',
  'ERR_CANCELED', 'INVALID_DETAIL_RESPONSE']);

export const newRentalRequestId = () => `rental-${Date.now()}-${++sequence}`;

export function logRentalDetail(event, details = {}) {
  if (!events.has(event)) return;
  const entry = { event, timestamp: new Date().toISOString() };
  if (/^[A-Za-z0-9-]{1,64}$/.test(details.requestId || '')) entry.requestId = details.requestId;
  if (operations.has(details.operation)) entry.operation = details.operation;
  if (reasons.has(details.reason)) entry.reason = details.reason;
  if (details.errorCode) entry.errorCode = codes.has(details.errorCode) ? details.errorCode : 'unknown';
  for (const key of ['durationMs', 'httpStatus', 'cacheAgeMs']) {
    if (Number.isFinite(details[key]) && details[key] >= 0) entry[key] = details[key];
  }
  // Do not include resource IDs, payment values, profiles, URLs, or raw error objects.
  if (event === 'request_failed') console.warn('[RentalDetail]', entry);
  else if (process.env.EXPO_PUBLIC_RENTAL_DIAGNOSTICS !== 'false') console.info('[RentalDetail]', entry);
}
