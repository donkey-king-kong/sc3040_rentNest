let attemptSequence = 0;
const safeErrorCodes = new Set([
  'ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ERR_BAD_REQUEST',
  'ERR_BAD_RESPONSE', 'ERR_CANCELED',
]);

// Keep Axios configs, response bodies and free-text messages out of diagnostics.
export function startPricingRequestLog(operation, listingId) {
  const started = Date.now();
  const safeId = /^\d{1,20}$/.test(String(listingId)) ? String(listingId) : 'unknown';
  const kind = operation === 'explanation' ? 'explanation' : 'estimate';
  const context = {
    attemptId: `${started}-${++attemptSequence}`,
    listingId: safeId,
    operation: kind,
    endpoint: `/api/pricing/listing/${safeId}${kind === 'explanation' ? '/explanation' : ''}`,
  };
  const write = (level, event, details = {}) => {
    console[level]('[PricingAI]', {
      ...context,
      event,
      timestamp: new Date().toISOString(),
      durationMs: Math.max(0, Date.now() - started),
      ...details,
    });
  };
  write('info', 'request_started');
  return {
    completed(response) {
      const available = response?.data?.available === true;
      write(available ? 'info' : 'warn', 'request_completed', {
        httpStatus: typeof response?.status === 'number' ? response.status : null,
        available,
      });
    },
    failed(error) {
      write('error', 'request_failed', {
        httpStatus: typeof error?.response?.status === 'number' ? error.response.status : null,
        errorCode: safeErrorCodes.has(error?.code) ? error.code : 'unknown',
      });
    },
  };
}
