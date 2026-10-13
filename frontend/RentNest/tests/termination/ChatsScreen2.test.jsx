import React from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ChatsScreen2 from '../../app/ChatsScreen2';
import TerminationRequestCard from '../../components/TerminationRequestCard';
import { chatData } from '../../config/chatData';
import { act } from 'react-test-renderer';
import { render, text, buttons, press, deferred } from './helpers';

const base = 'https://rentnest.test';
let messages;
let requests;
let viewerId;
let rental;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  chatData.clear('test');
  viewerId = 22;
  rental = {
    rentalID: 81, ownerUserId: 11, tenantUserID: 22, status: 'terminated',
    rentalPrice: 3000, depositPrice: 3000, leaseExpiry: '2026-12-31',
  };
  messages = [
    { messageID: 1, senderId: 11, requestId: 71, rentalId: null, date: '2026-10-12T10:00:00Z' },
    { messageID: 2, senderId: 11, requestId: 72, rentalId: null, date: '2026-10-12T10:01:00Z' },
  ];
  requests = {
    71: { requestID: 71, tenantUserId: 22, refundAmount: 9300, status: 'pending', listingName: 'First lease' },
    72: { requestID: 72, tenantUserId: 22, refundAmount: 100, status: 'rejected', listingName: 'Second lease' },
  };
  useRouter.mockReturnValue({ push: jest.fn(), replace: jest.fn(), back: jest.fn() });
  useLocalSearchParams.mockImplementation(() => ({
    currentUser: String(viewerId), partnerUserId: viewerId === 22 ? '11' : '22',
  }));
  AsyncStorage.getItem.mockResolvedValue('test-token');
  jwtDecode.mockReturnValue({ sub: 'viewer@example.test', exp: Math.floor(Date.now() / 1000) + 3600 });
  axios.get.mockImplementation(async url => {
    if (url.includes('/chathistory/conversations/')) {
      const partnerId = Number(url.split('/').pop().split('?')[0]);
      return {
        status: 200,
        data: {
          partner: { userID: partnerId, name: 'Chat partner', flagged: 0 },
          messages,
          hasMore: false,
        },
      };
    }
    if (url.includes('/users/id/')) return { data: { userID: 11, name: 'Chat partner', flagged: 0 } };
    if (url.includes('/users/')) return { data: { userID: viewerId } };
    if (url.includes('/rentals/')) return { data: rental };
    if (url.includes('/requests/')) return { data: requests[url.split('/').pop()] };
    throw new Error(`Unexpected GET: ${url}`);
  });
  axios.post.mockImplementation(async (url, { decision }) => {
    const id = url.split('/').at(-2);
    requests[id] = { ...requests[id], status: decision === 'accept' ? 'terminated' : 'rejected' };
    return { data: requests[id] };
  });
});

afterEach(() => {
  expect(axios.put).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('request-only messages mount independent real cards and refresh after a decision', async () => {
  const ui = await render(<ChatsScreen2 />);
  const cards = ui.root.findAllByType(TerminationRequestCard);
  expect(cards.map(card => card.props.requestId)).toEqual([71, 72]);
  expect(text(cards[0])).toContain('Pending');
  expect(text(cards[1])).toContain('Rejected');
  expect(axios.get.mock.calls.some(([url]) => url.includes('/rentals/'))).toBe(false);
  await press(ui, 'Accept termination');
  expect(axios.post).not.toHaveBeenCalled();
  await press(ui, 'Confirm termination');
  expect(axios.post.mock.calls).toEqual([[
    `${base}/api/requests/71/decision`, { decision: 'accept' },
    { headers: { Authorization: 'Bearer test-token' } },
  ]]);
  expect(axios.get.mock.calls.filter(([url]) => url.includes('/chathistory/conversations/'))).toHaveLength(2);
  expect(text(ui.root.findAllByType(TerminationRequestCard)[0])).toContain('Accepted');
  expect(text(ui.root.findAllByType(TerminationRequestCard)[1])).toContain('Rejected');
});

test('an owner sees no decision buttons even when route identity names the tenant', async () => {
  viewerId = 11;
  // Chat alignment trusts the route; decision authority must use the authenticated viewer.
  useLocalSearchParams.mockReturnValue({ currentUser: '22', partnerUserId: '11' });
  const ui = await render(<ChatsScreen2 />);
  expect(ui.root.findAllByType(TerminationRequestCard)).toHaveLength(2);
  expect(buttons(ui).map(text)).not.toContain('Accept termination');
  expect(buttons(ui).map(text)).not.toContain('Reject request');
});

test('a terminated rental offer never exposes tenant acceptance again', async () => {
  messages = [{ messageID: 1, senderId: 11, rentalId: 81, requestId: null, date: '2026-10-12T10:00:00Z' }];
  const ui = await render(<ChatsScreen2 />);
  expect(text(ui.toJSON())).toContain('Lease ended');
  expect(buttons(ui).map(text)).not.toContain('Accept offer');
});

test.each([11, 22])('terminated offer labels are truthful for viewer %s', async userID => {
  viewerId = userID;
  messages = [{ messageID: 1, senderId: 11, rentalId: 81, requestId: null, date: '2026-10-12T10:00:00Z' }];
  const ui = await render(<ChatsScreen2 />);
  const labels = ui.root.findAllByType('Text').map(text);
  expect(labels).not.toContain('New');
  expect(labels).not.toContain('Pending');
  expect(labels).not.toContain('Awaiting tenant response');
  expect(labels).toContain('Lease ended');
});

test.each([
  ['pending', 22, 22, true, 'New'],
  ['pending', 11, 22, false, 'Pending'],
  ['pending', 22, 33, false, 'New'],
  ['active', 22, 22, false, 'Accepted'],
  ['unexpected', 22, 22, false, 'Status unavailable'],
  [null, 22, 22, false, 'Status unavailable'],
])('offer %s for viewer %s and tenant %s gates acceptance', async (status, viewer, tenant, accepts, label) => {
  viewerId = viewer;
  rental = { ...rental, status, tenantUserID: tenant };
  messages = [{ messageID: 1, senderId: 11, rentalId: 81, date: '2026-10-12T10:00:00Z' }];
  const ui = await render(<ChatsScreen2 />);
  expect(text(ui.toJSON())).toContain(label);
  expect(buttons(ui).map(text).includes('Accept offer')).toBe(accepts);
});

test('failed offer loading is safe and can retry before rental details arrive', async () => {
  const response = deferred();
  const originalGet = axios.get.getMockImplementation();
  axios.get.mockImplementation(url => url.endsWith('/rentals/81') ? response.promise : originalGet(url));
  rental = { ...rental, status: 'pending' };
  messages = [{ messageID: 1, senderId: 11, rentalId: 81, date: '2026-10-12T10:00:00Z' }];
  const ui = await render(<ChatsScreen2 />);
  expect(text(ui.toJSON())).toContain('Loading offer details. Tap to retry.');
  await act(async () => { response.reject(new Error('Rental unavailable')); });
  expect(text(ui.toJSON())).toContain('Loading offer details. Tap to retry.');
  expect(buttons(ui).map(text)).not.toContain('Accept offer');
  axios.get.mockImplementation(originalGet);
  await press(ui, 'Loading offer details. Tap to retry.');
  expect(text(ui.toJSON())).not.toContain('Loading offer details. Tap to retry.');
  expect(buttons(ui).map(text)).toContain('Accept offer');
});
