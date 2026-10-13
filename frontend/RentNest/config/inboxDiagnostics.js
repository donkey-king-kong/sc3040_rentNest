let sequence = 0;
const safeCodes = new Set([
  'ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ERR_BAD_REQUEST',
  'ERR_BAD_RESPONSE', 'ERR_CANCELED', 'INVALID_INBOX_RESPONSE',
]);
const safeEvents = new Set([
  'request_started', 'request_completed', 'request_failed', 'response_discarded',
  'cache_hit', 'cache_miss', 'request_deduplicated', 'cache_invalidated', 'session_cleared',
]);
const safeReasons = new Set(['focus', 'manual', 'login', 'logout', 'mutation', 'auth_failure']);

export function newInboxRequestId() {
  return `inbox-${Date.now()}-${++sequence}`;
}

// Allowlist every field: never pass Axios errors, tokens, URLs or payloads to console.
export function logInbox(event, details = {}) {
  if (!safeEvents.has(event)) return;
  const entry = { event, timestamp: new Date().toISOString() };
  if (/^[A-Za-z0-9-]{1,64}$/.test(details.requestId || '')) entry.requestId = details.requestId;
  for (const key of ['durationMs', 'rows', 'httpStatus', 'cacheAgeMs']) {
    if (Number.isFinite(details[key]) && details[key] >= 0) entry[key] = details[key];
  }
  if (safeReasons.has(details.reason)) entry.reason = details.reason;
  if (details.errorCode) entry.errorCode = safeCodes.has(details.errorCode) ? details.errorCode : 'unknown';
  const level = event === 'request_failed' ? 'warn' : 'info';
  if (level === 'warn' || process.env.EXPO_PUBLIC_INBOX_DIAGNOSTICS !== 'false') {
    console[level]('[Inbox]', entry);
  }
}
