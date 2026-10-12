import React from 'react';
import { Alert, Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReviewListingScreen2 from '../../app/ReviewListingScreen2';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('axios');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../config/api', () => ({ API_BASE_URL: 'http://test.local' }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({ listingid: '65' }),
}));
jest.mock('../ProfileImage', () => () => null);

let alert;
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await AsyncStorage.setItem('token', 'test-token');
  axios.get.mockResolvedValue({ data: { listingID: 65, name: 'Hougang Apartment', ownerName: 'Owner' } });
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => alert.mockRestore());

const render = async () => {
  let tree;
  await act(async () => { tree = create(<ReviewListingScreen2 />); });
  return tree;
};
const button = (tree, label = 'Delete Listing') => tree.root.findAll(node =>
  typeof node.props.onPress === 'function'
  && node.findAllByType(Text).some(text => text.props.children === label))[0];

it('shows the occupied-property reason and stays on the review page', async () => {
  const message = 'Unable to delete this listing because a tenant is occupying the property.';
  axios.delete.mockRejectedValue({ response: { status: 409, data: { message } } });
  const tree = await render();
  await act(async () => { await button(tree).props.onPress(); });
  expect(alert).toHaveBeenCalledWith('Unable to delete listing', message);
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(button(tree).props.disabled).toBe(false);
});

it('navigates to success after a vacant listing is deleted', async () => {
  axios.delete.mockResolvedValue({ status: 204 });
  const tree = await render();
  await act(async () => { await button(tree).props.onPress(); });
  expect(axios.delete).toHaveBeenCalledWith('http://test.local/api/listings/65', expect.objectContaining({
    timeout: 15000, headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
  }));
  expect(mockReplace).toHaveBeenCalledWith('/ReviewListingScreen3');
  expect(alert).not.toHaveBeenCalled();
});

it('prevents duplicate submissions and disables dismissal while deletion is pending', async () => {
  let finish;
  axios.delete.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const tree = await render();
  const deleteAction = button(tree).props.onPress;
  let pending;
  await act(async () => { pending = deleteAction(); await Promise.resolve(); });
  expect(button(tree, 'Deleting…').props.disabled).toBe(true);
  expect(button(tree, 'Dismiss Report').props.disabled).toBe(true);
  await act(async () => { await deleteAction(); });
  expect(axios.delete).toHaveBeenCalledTimes(1);
  await act(async () => { finish({ status: 204 }); await pending; });
  expect(mockReplace).toHaveBeenCalledTimes(1);
});

it('explains a connection failure and permits a subsequent retry', async () => {
  axios.delete.mockRejectedValueOnce({ request: {} }).mockResolvedValueOnce({ status: 204 });
  const tree = await render();
  await act(async () => { await button(tree).props.onPress(); });
  expect(alert).toHaveBeenCalledWith('Unable to delete listing', "Couldn't reach the server. Check your connection and try again.");
  expect(mockPush).not.toHaveBeenCalled();
  await act(async () => { await button(tree).props.onPress(); });
  expect(mockReplace).toHaveBeenCalledWith('/ReviewListingScreen3');
});
