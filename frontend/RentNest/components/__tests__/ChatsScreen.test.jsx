import React from 'react';
import { AppState, FlatList } from 'react-native';
import { act, create } from 'react-test-renderer';
import ChatsScreen from '../../app/ChatsScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockLoadSummaries = jest.fn();
const mockPeekSummaries = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: callback => require('react').useEffect(callback, [callback]),
}));
jest.mock('../../config/chatData', () => ({
  chatData: {
    peekSummaries: (...args) => mockPeekSummaries(...args),
    loadSummaries: (...args) => mockLoadSummaries(...args),
  },
}));
jest.mock('../NavigationBar', () => 'NavigationBar');
jest.mock('../MorphingInfinity', () => 'MorphingInfinity');
jest.mock('../ProfileImage', () => 'ProfileImage');

const summaries = {
  currentUserId: 22,
  chats: [
    {
      partnerId: 11,
      partnerName: 'First partner',
      partnerPhotoURL: null,
      messageID: 1,
      message: 'First chat',
      date: '2026-10-13T00:00:00Z',
    },
    {
      partnerId: 33,
      partnerName: 'Second partner',
      partnerPhotoURL: null,
      messageID: 2,
      message: 'Second chat',
      date: '2026-10-13T00:01:00Z',
    },
  ],
};

let tree;

beforeEach(() => {
  jest.clearAllMocks();
  mockPeekSummaries.mockReturnValue(null);
  mockLoadSummaries.mockResolvedValue(summaries);
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
});

afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  tree = null;
  jest.restoreAllMocks();
});

it('loads summaries once when the first rows are published', async () => {
  await act(async () => {
    tree = create(<ChatsScreen />);
    await new Promise(resolve => setImmediate(resolve));
  });

  expect(mockLoadSummaries).toHaveBeenCalledTimes(1);
  expect(tree.root.findByType(FlatList).props.data).toHaveLength(2);
});
