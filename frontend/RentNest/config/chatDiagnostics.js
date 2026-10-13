let sequence = 0;

const enabled = process.env.EXPO_PUBLIC_CHAT_DIAGNOSTICS !== 'false';
const events = new Set([
  'request_started',
  'request_completed',
  'request_failed',
  'request_deduplicated',
  'cache_hit',
  'cache_miss',
  'cache_invalidated',
  'session_cleared',
]);
const operations = new Set(['summaries', 'conversation', 'older_messages']);

export function newChatRequestId() {
  sequence += 1;
  return `chat-${Date.now()}-${sequence}`;
}

export function logChat(event, details = {}) {
  if (!events.has(event) || !operations.has(details.operation)) return;
  const payload = { operation: details.operation };
  for (const field of ['durationMs', 'httpStatus', 'rowCount', 'cacheAgeMs']) {
    if (Number.isFinite(details[field])) payload[field] = details[field];
  }
  if (event === 'request_failed') {
    console.warn(`[Chat] ${event}`, payload);
  } else if (enabled) {
    console.info(`[Chat] ${event}`, payload);
  }
}
