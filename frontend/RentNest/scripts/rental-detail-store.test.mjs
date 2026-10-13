import assert from 'node:assert/strict';
import test from 'node:test';
import { createRentalDetailCache } from '../config/rentalDetailStore.js';
import { logRentalDetail } from '../config/rentalDetailDiagnostics.js';

const response = (data = { value: 'current' }) => ({ status: 200, data });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const tick = () => new Promise(resolve => setImmediate(resolve));
const setup = (request = async () => response()) => {
  let token = 'session-a';
  const calls = [];
  const cache = createRentalDetailCache({
    readToken: async () => token,
    request: (...args) => { calls.push(args); return request(...args); },
    validate: (_, data) => { if (!data?.value) throw Error('Invalid response'); },
    log: () => {},
  });
  return { cache, calls, resource: cache.resource('property:1'), setToken: value => { token = value; } };
};

test('resource identity is stable and overlapping loads share a request', async () => {
  const pending = deferred();
  const { cache, resource, calls } = setup(() => pending.promise);
  assert.equal(cache.resource('property:1'), resource);
  const first = resource.refresh();
  assert.equal(resource.refresh(), first);
  await tick();
  assert.equal(calls.length, 1);
  pending.resolve(response());
  await first;
  assert.equal(resource.getSnapshot().stale, false);
});

test('concurrent first-session resources both finish without cancelling each other', async () => {
  const { cache, resource, calls } = setup();
  const other = cache.resource('summary:1:2');
  await Promise.all([resource.refresh(), other.refresh()]);
  assert.equal(calls.length, 2);
  assert.ok(resource.getSnapshot().data);
  assert.ok(other.getSnapshot().data);
});

test('network errors preserve explicitly stale data and retry replaces it', async () => {
  let failed = false;
  const { resource } = setup(async () => {
    if (failed) throw { code: 'ERR_NETWORK' };
    return response();
  });
  await resource.refresh();
  failed = true;
  await resource.refresh();
  assert.ok(resource.getSnapshot().data);
  assert.ok(resource.getSnapshot().error);
  assert.equal(resource.getSnapshot().stale, true);
  failed = false;
  await resource.refresh();
  assert.equal(resource.getSnapshot().error, null);
  assert.equal(resource.getSnapshot().stale, false);
});

for (const status of [401, 403, 404, 409]) {
  test(`${status} removes cached resource data`, async () => {
    let failed = false;
    const { resource, cache } = setup(async () => {
      if (failed) throw { response: { status } };
      return response();
    });
    const other = cache.resource('summary:1:2');
    await Promise.all([resource.refresh(), other.refresh()]);
    failed = true;
    await resource.refresh();
    assert.equal(resource.getSnapshot().data, null);
    if (status === 401 || status === 403) {
      assert.equal(other.getSnapshot().data, null);
      assert.equal(resource.getSnapshot().unauthenticated, true);
    } else {
      assert.ok(resource.getSnapshot().error);
    }
  });
}

test('cold failure and invalid payload never become successful empty data', async () => {
  for (const request of [async () => { throw Error('network'); }, async () => response({})]) {
    const { resource } = setup(request);
    await resource.refresh();
    assert.equal(resource.getSnapshot().data, null);
    assert.ok(resource.getSnapshot().error);
    assert.equal(resource.getSnapshot().loading, false);
  }
});

test('logout aborts all requests and ignores late successes', async () => {
  const pending = deferred();
  const { resource, cache, calls } = setup(() => pending.promise);
  const work = resource.refresh();
  await tick();
  cache.clear();
  assert.equal(calls[0][2].aborted, true);
  pending.resolve(response());
  await work;
  assert.equal(resource.getSnapshot().data, null);
});

test('account switch clears all old resources before publishing new data', async () => {
  const pending = deferred();
  const { cache, resource, setToken } = setup((_, token) =>
    token === 'session-a' ? response() : pending.promise);
  const other = cache.resource('summary:1:2');
  await Promise.all([resource.refresh(), other.refresh()]);
  setToken('session-b');
  const work = resource.refresh();
  await tick();
  assert.equal(resource.getSnapshot().data, null);
  assert.equal(other.getSnapshot().data, null);
  pending.resolve(response({ value: 'new account' }));
  await work;
  assert.equal(resource.getSnapshot().data.value, 'new account');
});

test('a token change during the network request discards the response', async () => {
  const pending = deferred();
  const { resource, setToken } = setup(() => pending.promise);
  const work = resource.refresh();
  await tick();
  setToken('session-b');
  pending.resolve(response());
  await work;
  assert.equal(resource.getSnapshot().data, null);
});

test('clear during storage read prevents an obsolete request from starting', async () => {
  const pending = deferred();
  let calls = 0;
  const cache = createRentalDetailCache({
    readToken: () => pending.promise, request: () => calls++, validate: () => {}, log: () => {},
  });
  const work = cache.resource('property:1').refresh();
  cache.clear();
  pending.resolve('session-a');
  await work;
  assert.equal(calls, 0);
});

test('old auth failure cannot clear a newer session', async () => {
  const pending = deferred();
  const { cache, resource, setToken } = setup((_, token) =>
    token === 'session-a' ? pending.promise : response({ value: 'new account' }));
  const old = resource.refresh();
  await tick();
  cache.clear('login');
  setToken('session-b');
  await resource.refresh();
  pending.reject({ response: { status: 401 } });
  await old;
  assert.equal(resource.getSnapshot().data.value, 'new account');
});

test('mutation invalidation rejects earlier responses', async () => {
  const pending = deferred();
  let count = 0;
  const { cache, resource } = setup(() => ++count === 1 ? pending.promise : response({ value: 'new' }));
  const old = resource.refresh();
  await tick();
  cache.invalidate();
  await resource.refresh();
  pending.resolve(response({ value: 'old' }));
  await old;
  assert.equal(resource.getSnapshot().data.value, 'new');
});

test('blur cancellation ends loading and prevents late publication', async () => {
  const pending = deferred();
  const { resource, calls } = setup(() => pending.promise);
  const work = resource.refresh();
  await tick();
  resource.cancel();
  assert.equal(calls[0][2].aborted, true);
  assert.equal(resource.getSnapshot().loading, false);
  pending.resolve(response());
  await work;
  assert.equal(resource.getSnapshot().data, null);
});

test('missing token clears every resource without making another HTTP request', async () => {
  const { resource, calls, setToken } = setup();
  await resource.refresh();
  setToken(null);
  await resource.refresh();
  assert.equal(calls.length, 1);
  assert.equal(resource.getSnapshot().unauthenticated, true);
});

test('inactive cache history is bounded without evicting mounted resources', async () => {
  const { cache, resource } = setup();
  const stop = resource.subscribe(() => {});
  const inactive = cache.resource('property:2');
  for (let id = 3; id <= 40; id++) cache.resource(`property:${id}`);
  assert.equal(cache.resource('property:1'), resource);
  assert.notEqual(cache.resource('property:2'), inactive);
  stop();
});

test('diagnostics allow timing but redact resource IDs, amounts, tokens, URLs and errors', () => {
  const original = console.warn;
  let output;
  console.warn = (_, entry) => { output = JSON.stringify(entry); };
  try {
    logRentalDetail('request_failed', {
      operation: 'payments', requestId: 'unsafe\nPRIVATE', durationMs: 25, httpStatus: 500,
      token: 'PRIVATE', amount: 987654, listingId: 123456, url: 'PRIVATE',
      errorCode: 'PRIVATE', response: { data: 'PRIVATE' }, message: 'PRIVATE',
    });
    assert.match(output, /"durationMs":25/);
    assert.match(output, /"operation":"payments"/);
    assert.doesNotMatch(output, /PRIVATE|987654|123456/);
  } finally { console.warn = original; }
});
