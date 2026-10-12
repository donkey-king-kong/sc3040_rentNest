import React from 'react';
import { act } from 'react-test-renderer';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import TerminationRequestCard from '../../components/TerminationRequestCard';
import { render, text, button, buttons, press, deferred, httpError } from './helpers';

const base = 'https://rentnest.test';
const request = {
  requestID: 71, rentalId: 81, tenantUserId: 22, ownerUserId: 11,
  listingName: 'Test lease', refundAmount: 9300, status: 'pending',
};
let viewer;
let records;

beforeEach(() => {
  jest.clearAllMocks();
  viewer = { userID: 22 };
  records = { 71: { ...request } };
  AsyncStorage.getItem.mockResolvedValue('test-token');
  jwtDecode.mockReturnValue({ sub: 'tenant+qa@example.test' });
  axios.get.mockImplementation(async url => {
    if (url.includes('/api/users/')) return { data: viewer };
    const id = url.split('/').pop();
    if (records[id]) return { data: records[id] };
    throw new Error(`Unexpected GET: ${url}`);
  });
  axios.post.mockImplementation(async (url, body) => {
    const id = url.split('/').at(-2);
    return { data: { ...records[id], status: body.decision === 'accept' ? 'terminated' : 'rejected' } };
  });
});

afterEach(() => {
  expect(axios.put).not.toHaveBeenCalled();
  expect(axios.patch).not.toHaveBeenCalled();
  expect(axios.delete).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
});

test.each([11, 99])('viewer %s cannot accept or reject', async userID => {
  viewer = { userID };
  const ui = await render(<TerminationRequestCard requestId={71} />);
  expect(buttons(ui).map(text)).toEqual(['Refresh status']);
  expect(text(ui.toJSON())).toContain('Pending');
  expect(axios.post).not.toHaveBeenCalled();
});

test('accept requires confirmation and sends only one decision POST for the original ID', async () => {
  const onDecision = jest.fn();
  const ui = await render(<TerminationRequestCard requestId={71} onDecision={onDecision} />);
  expect(text(ui.toJSON())).toContain('9,300');
  await press(ui, 'Accept termination');
  expect(axios.post).not.toHaveBeenCalled();
  expect(text(ui.toJSON())).toContain('This cannot be undone');
  await press(ui, 'Go back');
  expect(axios.post).not.toHaveBeenCalled();
  await press(ui, 'Accept termination');
  await press(ui, 'Confirm termination');
  expect(axios.post.mock.calls).toEqual([[
    `${base}/api/requests/71/decision`, { decision: 'accept' },
    { headers: { Authorization: 'Bearer test-token' } },
  ]]);
  expect(onDecision).toHaveBeenCalledTimes(1);
  expect(text(ui.toJSON())).toContain('Accepted');
  expect(text(ui.toJSON())).toContain('This lease has ended');
  expect(buttons(ui).map(text)).toEqual(['Refresh status']);
  expect(axios.get).toHaveBeenCalledWith(
    `${base}/api/users/tenant%2Bqa%40example.test`,
    { headers: { Authorization: 'Bearer test-token' } },
  );
});

test('reject posts the request-specific decision and leaves an active-lease label', async () => {
  const ui = await render(<TerminationRequestCard requestId={71} />);
  await press(ui, 'Reject request');
  expect(axios.post).toHaveBeenCalledWith(
    `${base}/api/requests/71/decision`, { decision: 'reject' }, expect.any(Object));
  expect(text(ui.toJSON())).toContain('Rejected');
  expect(text(ui.toJSON())).toContain('The lease remains active');
  expect(buttons(ui).map(text)).toEqual(['Refresh status']);
});

test.each(['accept', 'reject'])('duplicate %s taps while saving produce one POST', async decision => {
  const pending = deferred();
  axios.post.mockReturnValue(pending.promise);
  const ui = await render(<TerminationRequestCard requestId={71} />);
  if (decision === 'accept') await press(ui, 'Accept termination');
  const action = button(ui, decision === 'accept' ? 'Confirm termination' : 'Reject request').props.onPress;
  await act(async () => { action(); action(); });
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(button(ui, 'Saving...').props.disabled).toBe(true);
  expect(buttons(ui).some(node => text(node).startsWith('Refresh'))).toBe(false);
  await act(async () => {
    pending.resolve({ data: { ...request, status: decision === 'accept' ? 'terminated' : 'rejected' } });
  });
  expect(axios.post).toHaveBeenCalledTimes(1);
});

test.each([
  ['pending', 'Pending', true],
  ['terminated', 'Accepted', false],
  ['rejected', 'Rejected', false],
  ['unknown', 'Unavailable', false],
])('server status %s renders %s with matching actions', async (status, label, actionable) => {
  records[71].status = status;
  const ui = await render(<TerminationRequestCard requestId={71} />);
  expect(text(ui.toJSON())).toContain(label);
  expect(buttons(ui).some(node => text(node) === 'Accept termination')).toBe(actionable);
});

test.each([
  [401, 'Your session expired'],
  [403, 'You do not have permission'],
  [404, 'no longer available'],
  [409, 'request or lease has changed'],
  [500, 'Unable to save your response'],
  [undefined, 'Unable to save your response'],
])('decision failure %s blocks actions until authoritative refresh', async (status, message) => {
  axios.post.mockRejectedValueOnce(status ? httpError(status) : new Error('offline'));
  const ui = await render(<TerminationRequestCard requestId={71} />);
  await press(ui, 'Reject request');
  expect(text(ui.toJSON())).toContain(message);
  expect(buttons(ui).map(text)).toEqual(['Refresh and retry']);
  records[71] = { ...request, status: 'terminated' };
  await press(ui, 'Refresh and retry');
  expect(text(ui.toJSON())).toContain('Accepted');
  expect(text(ui.toJSON())).not.toContain(message);
  expect(axios.post).toHaveBeenCalledTimes(1);
});

test('initial load failure is non-actionable and retry recovers', async () => {
  axios.get.mockRejectedValueOnce(new Error('offline'));
  const ui = await render(<TerminationRequestCard requestId={71} />);
  expect(text(ui.toJSON())).toContain('Unable to load this request');
  expect(buttons(ui).map(text)).toEqual(['Refresh and retry']);
  await press(ui, 'Refresh and retry');
  expect(button(ui, 'Accept termination')).toBeDefined();
  expect(axios.post).not.toHaveBeenCalled();
});

test('missing token prevents loading or deciding', async () => {
  AsyncStorage.getItem.mockResolvedValue(null);
  const ui = await render(<TerminationRequestCard requestId={71} />);
  expect(text(ui.toJSON())).toContain('Your session expired');
  expect(axios.get).not.toHaveBeenCalled();
  expect(axios.post).not.toHaveBeenCalled();
});

test('two cards remain independent when responses arrive in reverse order', async () => {
  const first = deferred();
  const second = deferred();
  records[72] = { ...request, requestID: 72, rentalId: 82, refundAmount: 100 };
  axios.get.mockImplementation(url => {
    if (url.includes('/api/users/')) return Promise.resolve({ data: viewer });
    return url.endsWith('/71') ? first.promise : second.promise;
  });
  const ui = await render(<><TerminationRequestCard requestId={71} /><TerminationRequestCard requestId={72} /></>);
  await act(async () => { second.resolve({ data: records[72] }); });
  await press(ui, 'Reject request');
  await act(async () => { first.resolve({ data: records[71] }); });
  const cards = ui.root.findAllByType(TerminationRequestCard);
  expect(text(cards[0])).toContain('Pending');
  expect(text(cards[1])).toContain('Rejected');
  expect(axios.post.mock.calls[0][0]).toBe(`${base}/api/requests/72/decision`);
});

test('changing request ID ignores a late response from the previous request', async () => {
  const old = deferred();
  axios.get.mockImplementation(url => {
    if (url.includes('/api/users/')) return Promise.resolve({ data: viewer });
    return url.endsWith('/71') ? old.promise : Promise.resolve({
      data: { ...request, requestID: 72, status: 'rejected', listingName: 'New lease' },
    });
  });
  const ui = await render(<TerminationRequestCard requestId={71} />);
  await act(async () => { ui.update(<TerminationRequestCard requestId={72} />); });
  await act(async () => { old.resolve({ data: request }); });
  expect(text(ui.toJSON())).toContain('New lease');
  expect(text(ui.toJSON())).toContain('Rejected');
  expect(text(ui.toJSON())).not.toContain('Test lease');
  expect(buttons(ui).map(text)).toEqual(['Refresh status']);
});
