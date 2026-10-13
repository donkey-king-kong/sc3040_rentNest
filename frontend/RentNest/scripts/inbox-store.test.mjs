import assert from 'node:assert/strict';
import test from 'node:test';
import { createInboxStore } from '../config/inboxStore.js';
import { logInbox } from '../config/inboxDiagnostics.js';

const row = (id = 1) => ({
  listingID: id, ownerId: 10, tenantId: null, role: 'Owner',
  name: 'Property', location: 'Address', listingpicture: null,
});
const response = (rows = [row()]) => ({ data: rows, status: 200 });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const tick = () => new Promise(resolve => setImmediate(resolve));
const setup = (request = async () => response()) => {
  let token = 'session-a';
  let calls = 0;
  const events = [];
  const store = createInboxStore({
    readToken: async () => token,
    request: (...args) => { calls++; return request(...args); },
    log: (event, details) => events.push({ event, ...details }),
  });
  return { store, events, calls: () => calls, setToken: value => { token = value; } };
};

test('one request loads data and repeated visits reuse cards while refreshing', async () => {
  const pending = deferred();
  let run = 0;
  const { store, calls, events } = setup(() => ++run === 1 ? response() : pending.promise);
  await store.refresh();
  const refresh = store.refresh();
  await tick();
  assert.deepEqual(store.getSnapshot().data, [row()]);
  assert.equal(store.getSnapshot().loading, true);
  pending.resolve(response([row(2)]));
  await refresh;
  assert.equal(calls(), 2);
  assert.equal(store.getSnapshot().data[0].listingID, 2);
  assert.ok(events.some(x => x.event === 'cache_hit'));
});

test('overlapping focus and manual requests share one promise and HTTP call', async () => {
  const pending = deferred();
  const { store, calls } = setup(() => pending.promise);
  const first = store.refresh();
  const second = store.refresh('manual');
  assert.equal(first, second);
  await tick();
  assert.equal(calls(), 1);
  pending.resolve(response());
  await first;
});

test('an empty successful inbox is cached rather than treated as a cache miss', async () => {
  const { store, events } = setup(async () => response([]));
  await store.refresh();
  await store.refresh();
  assert.deepEqual(store.getSnapshot().data, []);
  assert.equal(store.getSnapshot().error, null);
  assert.ok(events.some(x => x.event === 'cache_hit'));
});

test('network failure preserves cached cards and retry clears the error', async () => {
  let fail = false;
  const { store } = setup(async () => {
    if (fail) throw { code: 'ERR_NETWORK' };
    return response();
  });
  await store.refresh();
  fail = true;
  await store.refresh();
  assert.deepEqual(store.getSnapshot().data, [row()]);
  assert.ok(store.getSnapshot().error);
  fail = false;
  await store.refresh('manual');
  assert.equal(store.getSnapshot().error, null);
});

test('cold-load failure is not an empty inbox', async () => {
  const { store } = setup(async () => { throw { code: 'ECONNABORTED' }; });
  await store.refresh();
  assert.equal(store.getSnapshot().data, null);
  assert.ok(store.getSnapshot().error);
  assert.equal(store.getSnapshot().loading, false);
});

for (const status of [401, 403]) {
  test(`${status} clears cards and marks the session unauthenticated`, async () => {
    let fail = false;
    const { store } = setup(async () => {
      if (fail) throw { response: { status } };
      return response();
    });
    await store.refresh();
    fail = true;
    await store.refresh();
    assert.equal(store.getSnapshot().data, null);
    assert.equal(store.getSnapshot().unauthenticated, true);
  });
}

test('missing/expired token clears cache without a request', async () => {
  const { store, setToken, calls } = setup();
  await store.refresh();
  setToken(null);
  await store.refresh();
  assert.equal(calls(), 1);
  assert.equal(store.getSnapshot().data, null);
  assert.equal(store.getSnapshot().unauthenticated, true);
});

test('logout aborts requests and late data cannot repopulate the cache', async () => {
  const pending = deferred();
  let signal;
  const { store } = setup((_, supplied) => { signal = supplied; return pending.promise; });
  const work = store.refresh();
  await tick();
  store.clear('logout');
  assert.equal(signal.aborted, true);
  pending.resolve(response());
  await work;
  assert.equal(store.getSnapshot().data, null);
});

test('account change hides previous cards while the new request is pending', async () => {
  const pending = deferred();
  const { store, setToken } = setup(token => token === 'session-a' ? response() : pending.promise);
  await store.refresh();
  setToken('session-b');
  const work = store.refresh();
  await tick();
  assert.equal(store.getSnapshot().data, null);
  pending.resolve(response([row(2)]));
  await work;
  assert.equal(store.getSnapshot().data[0].listingID, 2);
});

test('an old request failure cannot clear a newer account response', async () => {
  const pending = deferred();
  const { store, setToken } = setup(token => token === 'session-a' ? pending.promise : response([row(2)]));
  const old = store.refresh();
  await tick();
  store.clear('login');
  setToken('session-b');
  await store.refresh();
  pending.reject({ response: { status: 401 } });
  await old;
  assert.equal(store.getSnapshot().data[0].listingID, 2);
  assert.equal(store.getSnapshot().unauthenticated, false);
});

test('mutation invalidation prevents an older response overwriting a fresh response', async () => {
  const pending = deferred();
  let run = 0;
  const { store } = setup(() => ++run === 1 ? pending.promise : response([row(2)]));
  const old = store.refresh();
  await tick();
  store.invalidate();
  await store.refresh();
  pending.resolve(response());
  await old;
  assert.equal(store.getSnapshot().data[0].listingID, 2);
});

test('token changes during HTTP discard the response even without an explicit clear', async () => {
  const pending = deferred();
  const { store, setToken } = setup(() => pending.promise);
  const work = store.refresh();
  await tick();
  setToken('session-b');
  pending.resolve(response());
  await work;
  assert.equal(store.getSnapshot().data, null);
});

test('a session reset during storage lookup prevents an old HTTP request', async () => {
  const pending = deferred();
  let calls = 0;
  const store = createInboxStore({
    readToken: () => pending.promise, request: () => { calls++; }, log: () => {},
  });
  const work = store.refresh();
  store.clear();
  pending.resolve('old-token');
  await work;
  assert.equal(calls, 0);
});

test('malformed response is an error, not an empty successful inbox', async () => {
  const { store } = setup(async () => response({ message: 'wrong contract' }));
  await store.refresh();
  assert.equal(store.getSnapshot().data, null);
  assert.ok(store.getSnapshot().error);
});

test('subscribers receive reset and fetch changes; unsubscribe removes notifications', async () => {
  const { store } = setup();
  let notified = 0;
  const stop = store.subscribe(() => notified++);
  await store.refresh();
  assert.ok(notified > 0);
  const count = notified;
  stop();
  store.clear();
  assert.equal(notified, count);
});

test('diagnostics redact arbitrary messages, response objects and unsafe IDs', () => {
  const original = console.warn;
  let logged;
  console.warn = (_, value) => { logged = JSON.stringify(value); };
  try {
    logInbox('request_failed', {
      requestId: 'bad\nPRIVATE_TOKEN', errorCode: 'PRIVATE_ERROR', durationMs: 23,
      httpStatus: 500, token: 'PRIVATE_TOKEN', data: 'PRIVATE_BODY', message: 'PRIVATE_MESSAGE',
      response: { config: { headers: { Authorization: 'PRIVATE_TOKEN' } } },
    });
    assert.ok(logged.includes('"durationMs":23'));
    assert.ok(logged.includes('"errorCode":"unknown"'));
    assert.ok(!logged.includes('PRIVATE'));
  } finally { console.warn = original; }
});
