import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startPricingRequestLog } from '../config/pricingDiagnostics.js';

function capture(t) {
  const calls = [];
  for (const level of ['info', 'warn', 'error']) {
    t.mock.method(console, level, (...args) => calls.push({ level, prefix: args[0], fields: args[1] }));
  }
  return calls;
}

test('successful estimate logs lifecycle, timing, status, and a consistent attempt ID', t => {
  const calls = capture(t);
  const log = startPricingRequestLog('estimate', 41);
  log.completed({ status: 200, data: { available: true, description: 'private description' } });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].fields.event, 'request_started');
  assert.equal(calls[1].fields.event, 'request_completed');
  assert.equal(calls[1].level, 'info');
  assert.equal(calls[1].fields.httpStatus, 200);
  assert.equal(calls[1].fields.available, true);
  assert.equal(calls[1].fields.endpoint, '/api/pricing/listing/41');
  assert.equal(calls[1].fields.attemptId, calls[0].fields.attemptId);
  assert.ok(calls[1].fields.durationMs >= 0);
  assert.ok(!JSON.stringify(calls).includes('private description'));
});

test('HTTP 200 with available false stays informational without dumping the response message', t => {
  const calls = capture(t);
  const log = startPricingRequestLog('explanation', '41');
  log.completed({
    status: 200,
    data: { available: false, message: 'provider error containing private-token', model: 'private model data' },
  });
  assert.equal(calls[1].level, 'info');
  assert.equal(calls[1].fields.httpStatus, 200);
  assert.equal(calls[1].fields.available, false);
  assert.equal(calls[1].fields.endpoint, '/api/pricing/listing/41/explanation');
  assert.ok(!JSON.stringify(calls).includes('private'));
});

test('handled transport errors stay informational and exclude Axios secrets', t => {
  const calls = capture(t);
  startPricingRequestLog('explanation', 41).failed({
    code: 'ERR_BAD_RESPONSE',
    message: 'private message',
    config: { headers: { Authorization: 'Bearer private-token' } },
    response: { status: 503, data: { message: 'private provider text' } },
  });
  assert.equal(calls[1].level, 'info');
  assert.equal(calls[1].fields.event, 'request_failed');
  assert.equal(calls[1].fields.httpStatus, 503);
  assert.equal(calls[1].fields.errorCode, 'ERR_BAD_RESPONSE');
  assert.ok(!JSON.stringify(calls).includes('private'));
});

test('timeout without an HTTP response is distinct from an HTTP error', t => {
  const calls = capture(t);
  startPricingRequestLog('explanation', 41).failed({ code: 'ECONNABORTED' });
  assert.equal(calls[1].level, 'info');
  assert.equal(calls[1].fields.event, 'request_timed_out');
  assert.equal(calls[1].fields.httpStatus, null);
  assert.equal(calls[1].fields.errorCode, 'ECONNABORTED');
});

test('React Native network error at the deadline is classified as a timeout', t => {
  const calls = capture(t);
  startPricingRequestLog('estimate', 41, 0).failed({ code: 'ERR_NETWORK' });
  assert.equal(calls[1].level, 'info');
  assert.equal(calls[1].fields.event, 'request_timed_out');
  assert.equal(calls[1].fields.errorCode, 'ERR_NETWORK');
});

test('unexpected free-text error codes and route values are not logged', t => {
  const calls = capture(t);
  startPricingRequestLog('private operation', 'private-token').failed({ code: 'private error' });
  assert.equal(calls[1].fields.errorCode, 'unknown');
  assert.equal(calls[1].fields.listingId, 'unknown');
  assert.ok(!JSON.stringify(calls).includes('private'));
});

test('malformed success payload is logged as an informational unavailable state', t => {
  const calls = capture(t);
  startPricingRequestLog('explanation', 41).completed({ status: 200 });
  assert.equal(calls[1].level, 'info');
  assert.equal(calls[1].fields.available, false);
});

test('concurrent requests have separate attempt identifiers', t => {
  const calls = capture(t);
  const first = startPricingRequestLog('explanation', 41);
  const second = startPricingRequestLog('explanation', 41);
  assert.notEqual(calls[0].fields.attemptId, calls[1].fields.attemptId);
  second.completed({ status: 200, data: { available: true } });
  first.failed({ code: 'ERR_NETWORK' });
  assert.equal(calls[2].fields.attemptId, calls[1].fields.attemptId);
  assert.equal(calls[3].fields.attemptId, calls[0].fields.attemptId);
});
