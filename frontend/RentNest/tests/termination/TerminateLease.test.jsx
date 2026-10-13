import React from 'react';
import { act } from 'react-test-renderer';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { useLocalSearchParams, useRouter } from 'expo-router';
import TerminateLease from '../../app/TerminateLease';
import { render, text, button, buttons, press, deferred, httpError } from './helpers';

const base = 'https://rentnest.test';
const lease = { rentalID: 81, ownerUserId: 11, tenantUserID: 22, status: 'active' };
let viewer;
let rental;
let route;
let router;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  viewer = { userID: 11 };
  rental = { ...lease };
  route = { rentalId: '81' };
  router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
  useRouter.mockReturnValue(router);
  useLocalSearchParams.mockImplementation(() => route);
  AsyncStorage.getItem.mockResolvedValue('test-token');
  jwtDecode.mockReturnValue({ sub: 'owner@example.test' });
  axios.get.mockImplementation(async url => {
    if (url.includes('/api/users/')) return { data: viewer };
    if (url.includes('/api/rentals/')) return { data: rental };
    throw new Error(`Unexpected GET: ${url}`);
  });
  axios.post.mockResolvedValue({ status: 201, data: { requestID: 71 } });
});

afterEach(() => {
  jest.useRealTimers();
  expect(axios.put).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
});

async function amount(ui, value) {
  await act(async () => { ui.root.findByType('TextInput').props.onChangeText(value); });
}

test.each(['1', '9300', '0010', String(Number.MAX_SAFE_INTEGER)])(
  'valid whole-dollar amount %s is submitted without rounding', async value => {
    const ui = await render(<TerminateLease />);
    await amount(ui, value);
    expect(button(ui, 'Submit termination').props.disabled).toBe(false);
    await press(ui, 'Submit termination');
    expect(axios.post.mock.calls).toEqual([[
      `${base}/api/requests/terminationrequest/81/${value}`, {},
      { headers: {
        Authorization: 'Bearer test-token', Accept: 'application/json', 'Content-Type': 'application/json',
      } },
    ]]);
    expect(text(ui.toJSON())).toContain('Termination Submitted');
    expect(button(ui, 'Submit termination').props.disabled).toBe(true);
    await act(async () => { jest.advanceTimersByTime(2000); });
    expect(router.push).toHaveBeenCalledWith('/ChatsScreen2?partnerUserId=22&currentUser=11&scrollAfterSend=true');
  },
);

test.each(['', '0', '00', '-1', '1.5', '1.00', '1e3', '+1', ' 10 ', 'abc', 'NaN', 'Infinity', '1,000', '9007199254740992'])(
  'invalid refund %j cannot submit even through the handler', async value => {
    const ui = await render(<TerminateLease />);
    await amount(ui, value);
    const submit = button(ui, 'Submit termination');
    expect(submit.props.disabled).toBe(true);
    await act(async () => { await submit.props.onPress(); });
    expect(axios.post).not.toHaveBeenCalled();
    if (value) expect(text(ui.toJSON())).toContain('Enter a positive whole-dollar amount');
  },
);

test('No refund clears invalid input, locks the amount, and submits zero', async () => {
  const ui = await render(<TerminateLease />);
  await amount(ui, '9.50');
  await press(ui, 'No refund');
  expect(ui.root.findByType('TextInput').props).toMatchObject({ value: '', editable: false });
  expect(text(ui.toJSON())).not.toContain('Enter a positive whole-dollar amount');
  await press(ui, 'Submit termination');
  expect(axios.post).toHaveBeenCalledWith(
    `${base}/api/requests/terminationrequest/81/0`, {}, expect.any(Object));
});

test('switching back to Refund tenant requires a fresh positive amount', async () => {
  const ui = await render(<TerminateLease />);
  await press(ui, 'No refund');
  await press(ui, 'Refund tenant');
  expect(ui.root.findByType('TextInput').props.editable).toBe(true);
  expect(button(ui, 'Submit termination').props.disabled).toBe(true);
});

test('same-tick double submission sends one POST and locks form controls', async () => {
  const pending = deferred();
  axios.post.mockReturnValue(pending.promise);
  const ui = await render(<TerminateLease />);
  await amount(ui, '9300');
  const submit = button(ui, 'Submit termination').props.onPress;
  await act(async () => { submit(); submit(); });
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(button(ui, 'Submitting...').props.disabled).toBe(true);
  expect(button(ui, 'No refund').props.disabled).toBe(true);
  expect(ui.root.findByType('TextInput').props.editable).toBe(false);
  await act(async () => { pending.resolve({ status: 201 }); });
  expect(button(ui, 'Submit termination').props.disabled).toBe(true);
  await act(async () => { await button(ui, 'Submit termination').props.onPress(); });
  expect(axios.post).toHaveBeenCalledTimes(1);
});

test.each([
  [22, 'active'], [99, 'active'], [11, 'terminated'], [11, 'pending'], [11, 'rejected'],
])('viewer %s cannot propose for a %s lease', async (userID, status) => {
  viewer = { userID };
  rental.status = status;
  const ui = await render(<TerminateLease />);
  expect(text(ui.toJSON())).toContain('Only the owner of an active lease');
  expect(buttons(ui).map(text)).toEqual(['Go back']);
  expect(axios.post).not.toHaveBeenCalled();
});

test.each([
  [401, 'Your session expired'],
  [403, 'Only the owner of this lease'],
  [409, 'already has a termination request'],
  [500, 'Unable to submit the request'],
  [undefined, 'Unable to submit the request'],
])('submission error %s is actionable and never navigates as success', async (status, message) => {
  axios.post.mockRejectedValueOnce(status ? httpError(status) : new Error('offline'));
  const ui = await render(<TerminateLease />);
  await amount(ui, '100');
  await press(ui, 'Submit termination');
  expect(text(ui.toJSON())).toContain(message);
  expect(text(ui.toJSON())).not.toContain('Termination Submitted');
  expect(button(ui, 'Submit termination').props.disabled).toBe(false);
  await act(async () => { jest.advanceTimersByTime(2000); });
  expect(router.push).not.toHaveBeenCalled();
  await press(ui, 'View tenant chat');
  expect(router.push).toHaveBeenCalledWith('/ChatsScreen2?partnerUserId=22&currentUser=11');
});

test('initial lease load failure blocks submission and Retry restores the form', async () => {
  axios.get.mockRejectedValueOnce(new Error('offline'));
  const ui = await render(<TerminateLease />);
  expect(text(ui.toJSON())).toContain('Unable to load this lease');
  expect(buttons(ui).map(text)).toEqual(['Retry', 'Go back']);
  await press(ui, 'Retry');
  expect(button(ui, 'Submit termination').props.disabled).toBe(true);
  expect(ui.root.findAllByType('TextInput')).toHaveLength(1);
});

test('no session redirects without loading the lease', async () => {
  AsyncStorage.getItem.mockResolvedValue(null);
  await render(<TerminateLease />);
  expect(router.replace).toHaveBeenCalledWith('/LandingScreen');
  expect(axios.get).not.toHaveBeenCalled();
  expect(axios.post).not.toHaveBeenCalled();
});

test('session lost before submission redirects without a POST', async () => {
  const ui = await render(<TerminateLease />);
  await press(ui, 'No refund');
  AsyncStorage.getItem.mockResolvedValue(null);
  await press(ui, 'Submit termination');
  expect(router.replace).toHaveBeenCalledWith('/LoginScreen');
  expect(axios.post).not.toHaveBeenCalled();
});

test('unmount cancels delayed success navigation', async () => {
  const ui = await render(<TerminateLease />);
  await press(ui, 'No refund');
  await press(ui, 'Submit termination');
  await act(async () => { ui.unmount(); });
  await act(async () => { jest.advanceTimersByTime(2000); });
  expect(router.push).not.toHaveBeenCalled();
});

test('submission completing after unmount must not redirect back to chat', async () => {
  const pending = deferred();
  axios.post.mockReturnValue(pending.promise);
  const ui = await render(<TerminateLease />);
  await press(ui, 'No refund');
  await act(async () => { button(ui, 'Submit termination').props.onPress(); });
  await act(async () => { ui.unmount(); });
  await act(async () => { pending.resolve({ status: 201 }); });
  await act(async () => { jest.advanceTimersByTime(2000); });
  expect(router.push).not.toHaveBeenCalled();
});

test('a late load from an old route must not authorize the newly selected lease', async () => {
  const old = deferred();
  axios.get.mockImplementation(url => {
    if (url.includes('/api/users/')) return Promise.resolve({ data: viewer });
    return url.endsWith('/81') ? old.promise : Promise.resolve({
      data: { ...lease, rentalID: 82, ownerUserId: 99 },
    });
  });
  const ui = await render(<TerminateLease />);
  route = { rentalId: '82' };
  await act(async () => { ui.update(<TerminateLease />); });
  expect(text(ui.toJSON())).toContain('Only the owner of an active lease');
  await act(async () => { old.resolve({ data: lease }); });
  expect(text(ui.toJSON())).toContain('Only the owner of an active lease');
  expect(buttons(ui).some(node => text(node) === 'Submit termination')).toBe(false);
});
