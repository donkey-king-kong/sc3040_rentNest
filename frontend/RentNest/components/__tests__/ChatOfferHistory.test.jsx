import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { act, create } from 'react-test-renderer';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChatsScreen2 from '../../app/ChatsScreen2';

let mockRouteParams;
jest.mock('axios');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../config/api', () => ({ API_BASE_URL: 'http://test.local' }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockRouteParams,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../components/MorphingInfinity', () => () => null);
jest.mock('../../components/AvatarOrb', () => () => null);

const text = tree => tree.root.findAllByType(Text)
  .map(node => [].concat(node.props.children).filter(child => typeof child === 'string' || typeof child === 'number').join(''));
const buttons = tree => tree.root.findAllByType(TouchableOpacity)
  .map(node => node.findAllByType(Text).map(child => child.props.children).join(' '));

const renderConversation = async ({ status = 'pending', currentUser = 3, tenantUserID = 3, withTermination = false, rentalID = 15, rentalFails = false } = {}) => {
  mockRouteParams = { partnerUserId: String(currentUser === 1 ? 3 : 1), currentUser: String(currentUser) };
  const chats = [
    { messageID: 201, senderId: 3, receiverId: 1, rentalId: null, requestId: null, message: 'The viewing went well.', date: '2025-07-06T10:00:00Z' },
    { messageID: 202, senderId: 1, receiverId: 3, rentalId: 15, requestId: null, message: 'Rental Offer', date: '2025-07-06T12:00:00Z' },
    ...(withTermination ? [{ messageID: 203, senderId: 1, receiverId: 3, rentalId: null, requestId: 8, message: null, date: '2026-06-30T10:00:00Z' }] : []),
  ];
  axios.get.mockImplementation(async url => {
    if (url.includes('/chathistory/conversation')) return { data: chats };
    if (url.includes('/rentals/15')) {
      if (rentalFails) throw new Error('Rental unavailable');
      return { data: { rentalID, tenantUserID, ownerUserId: 1, status, rentalPrice: 4650, depositPrice: 9300, leaseExpiry: '2027-08-01T00:00:00Z' } };
    }
    if (url.includes('/requests/8')) return { data: { requestID: 8, rentalId: 15, status: 'terminated', refundAmount: 9300 } };
    if (url.includes('/users/id/')) return { data: { userID: currentUser === 1 ? 3 : 1, name: 'Chat partner', photoURL: null } };
    throw new Error('Unexpected mocked endpoint');
  });
  let tree;
  await act(async () => { tree = create(<ChatsScreen2 />); });
  return tree;
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await AsyncStorage.setItem('token', 'test-token');
});

it('shows a pending owner offer as awaiting the tenant, without acceptance controls', async () => {
  const tree = await renderConversation({ currentUser: 1 });
  expect(text(tree)).toEqual(expect.arrayContaining(['Pending', 'Awaiting tenant response']));
  expect(buttons(tree)).not.toContain('Accept offer');
  expect(buttons(tree)).not.toContain('Decline');
});

it('lets the named tenant open payment for a pending offer', async () => {
  const tree = await renderConversation();
  expect(text(tree)).toContain('New');
  expect(buttons(tree)).toEqual(expect.arrayContaining(['Accept offer', 'Decline']));
  const accept = tree.root.findAllByType(TouchableOpacity)
    .find(node => node.findAllByType(Text).some(child => child.props.children === 'Accept offer'));
  expect(text(tree)).not.toContain('Pay deposit');
  await act(async () => accept.props.onPress());
  expect(text(tree)).toContain('Pay deposit');
  expect(axios.post).not.toHaveBeenCalled();
  expect(axios.put).not.toHaveBeenCalled();
});

it.each([1, 3])('shows an active offer as accepted for participant %s', async currentUser => {
  const tree = await renderConversation({ status: 'active', currentUser });
  expect(text(tree).filter(value => value === 'Accepted')).toHaveLength(2);
  expect(buttons(tree)).not.toContain('Accept offer');
  expect(buttons(tree)).not.toContain('Decline');
});

it.each([1, 3])('shows terminated history without new offer actions for participant %s', async currentUser => {
  const tree = await renderConversation({ status: 'terminated', currentUser, withTermination: true });
  expect(text(tree).filter(value => value === 'Terminated')).toHaveLength(2);
  expect(text(tree)).toEqual(expect.arrayContaining(['Accepted', 'The viewing went well.', '$4,650', '$9,300', 'Amount to be refunded: $9300']));
  expect(text(tree)).not.toContain('Awaiting tenant response');
  expect(text(tree)).not.toContain('New');
  expect(buttons(tree)).not.toContain('Accept offer');
  expect(buttons(tree)).not.toContain('Decline');
  expect(buttons(tree)).not.toContain('Accept');
  expect(axios.post).not.toHaveBeenCalled();
  expect(axios.put).not.toHaveBeenCalled();
});

it.each(['unexpected', '', null])('does not treat unrecognized status %s as pending', async status => {
  const tree = await renderConversation({ status });
  expect(text(tree)).toContain('Status unavailable');
  expect(buttons(tree)).not.toContain('Accept offer');
  expect(buttons(tree)).not.toContain('Decline');
});

it('does not expose acceptance if the current recipient is not the rental tenant', async () => {
  const tree = await renderConversation({ tenantUserID: 21 });
  expect(buttons(tree)).not.toContain('Accept offer');
});

it('does not reuse another rental state to expose acceptance', async () => {
  const tree = await renderConversation({ rentalID: 17 });
  expect(text(tree)).toContain('Status unavailable');
  expect(buttons(tree)).not.toContain('Accept offer');
});

it('does not expose acceptance when the rental request fails', async () => {
  const tree = await renderConversation({ rentalFails: true });
  expect(text(tree)).toContain('Status unavailable');
  expect(buttons(tree)).not.toContain('Accept offer');
});
