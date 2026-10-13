import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { chatData } from '../../config/chatData';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
}));
jest.mock('axios', () => ({
  get: jest.fn(),
}));
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(),
}));

const summaryPayload = {
  currentUserId: 22,
  chats: [{
    partnerId: 11,
    partnerName: 'Partner',
    partnerPhotoURL: null,
    messageID: 5,
    message: 'Hello',
    date: '2026-10-13T00:00:00Z',
  }],
};

const page = (messages, hasMore = false) => ({
  partner: { userID: 11, name: 'Partner', photoURL: null, flagged: 0 },
  messages,
  hasMore,
});

beforeEach(() => {
  jest.clearAllMocks();
  chatData.clear('test');
  AsyncStorage.getItem.mockResolvedValue('session-a');
  jwtDecode.mockImplementation(token => ({
    sub: `${token}@test.local`,
    exp: Math.floor(Date.now() / 1000) + 3600,
  }));
});

it('deduplicates concurrent summary requests and serves a fresh cache hit', async () => {
  let resolve;
  axios.get.mockImplementation(() => new Promise(done => { resolve = done; }));
  const first = chatData.loadSummaries();
  const second = chatData.loadSummaries();
  await new Promise(resolveTick => setImmediate(resolveTick));
  expect(axios.get).toHaveBeenCalledTimes(1);
  resolve({ status: 200, data: summaryPayload });
  await expect(Promise.all([first, second])).resolves.toEqual([summaryPayload, summaryPayload]);

  await expect(chatData.loadSummaries()).resolves.toEqual(summaryPayload);
  expect(axios.get).toHaveBeenCalledTimes(1);
});

it('merges older pages without duplicate messages', async () => {
  axios.get
    .mockResolvedValueOnce({
      status: 200,
      data: page([{ messageID: 3 }, { messageID: 4 }], true),
    })
    .mockResolvedValueOnce({
      status: 200,
      data: page([{ messageID: 1 }, { messageID: 2 }, { messageID: 3 }], false),
    });

  await chatData.loadConversation(11, { force: true });
  const merged = await chatData.loadConversation(11, {
    beforeMessageId: 3,
    force: true,
  });
  expect(merged.messages.map(message => message.messageID)).toEqual([1, 2, 3, 4]);
  expect(merged.hasMore).toBe(false);
});

it('clears the previous account cache when the token changes', async () => {
  axios.get.mockResolvedValue({ status: 200, data: summaryPayload });
  await chatData.loadSummaries({ force: true });
  expect(chatData.peekSummaries()).toEqual(summaryPayload);

  AsyncStorage.getItem.mockResolvedValue('session-b');
  await chatData.loadSummaries({ force: true });
  expect(axios.get).toHaveBeenCalledTimes(2);
});

it('rejects malformed responses without caching them', async () => {
  axios.get.mockResolvedValue({ status: 200, data: { chats: [] } });
  await expect(chatData.loadSummaries({ force: true })).rejects.toThrow(
    'Invalid chat summary response',
  );
  expect(chatData.peekSummaries()).toBeNull();
});
