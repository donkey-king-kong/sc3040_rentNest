import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ModerationListState, { moderationLoadError } from '../ModerationListState';
import BanUserScreen from '../../app/BanUserScreen';
import ProcessReviewsScreen from '../../app/ProcessReviewsScreen';

jest.mock('axios');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../config/api', () => ({ API_BASE_URL: 'http://test.local', ENDPOINTS: {} }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const renderedText = (tree) => tree.root.findAllByType(Text)
  .map((node) => [].concat(node.props.children).filter((child) => typeof child === 'string').join(''))
  .filter(Boolean);

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await AsyncStorage.setItem('token', 'test-token');
});

describe('ModerationListState', () => {
  it('shows a loading state', () => {
    const text = renderedText(create(<ModerationListState loading emptyText="No reported users right now." />));
    expect(text).toContain('Loading…');
    expect(text).not.toContain('No reported users right now.');
  });

  it('shows an error with a retry button instead of the empty message', () => {
    const onRetry = jest.fn();
    const tree = create(<ModerationListState error="Something failed." onRetry={onRetry} emptyText="No reported users right now." />);
    const text = renderedText(tree);
    expect(text).toContain('Something failed.');
    expect(text).toContain('Try again');
    expect(text).not.toContain('No reported users right now.');
  });

  it('tells a searching admin that nothing matched, not that nothing is reported', () => {
    const text = renderedText(create(<ModerationListState searching emptyText="No reported users right now." />));
    expect(text).toContain('No results match your search.');
    expect(text).not.toContain('No reported users right now.');
  });

  it('shows the empty message when the list is genuinely empty', () => {
    const text = renderedText(create(<ModerationListState emptyText="No reported users right now." />));
    expect(text).toContain('No reported users right now.');
  });
});

describe('moderationLoadError', () => {
  it('explains a permission failure', () => {
    expect(moderationLoadError({ response: { status: 403 } }, 'users')).toBe('You need to be logged in as an admin to see this.');
  });

  it('explains a network failure', () => {
    expect(moderationLoadError({}, 'users')).toBe("Can't reach the server. Check your connection and try again.");
  });

  it('names the list for other server errors', () => {
    expect(moderationLoadError({ response: { status: 500 } }, 'reviews')).toBe("Couldn't load reported reviews. Please try again.");
  });
});

describe('moderation screens', () => {
  jest.setTimeout(30000);

  it('Ban User shows the empty message when nobody is reported', async () => {
    axios.get.mockResolvedValue({ data: [] });
    let tree;
    await act(async () => { tree = create(<BanUserScreen />); });
    expect(renderedText(tree)).toContain('No reported users right now.');
  });

  it('Ban User shows an error, not "no reported users", when the request is refused', async () => {
    axios.get.mockRejectedValue({ response: { status: 403 } });
    let tree;
    await act(async () => { tree = create(<BanUserScreen />); });
    const text = renderedText(tree);
    expect(text).toContain('You need to be logged in as an admin to see this.');
    expect(text).not.toContain('No reported users right now.');
  });

  it('Ban User lists reported users', async () => {
    axios.get.mockResolvedValue({ data: [
      { userID: 7, name: 'Reported One', email: 'one@test.local', flagged: 1 },
      { userID: 8, name: 'Reported Two', email: 'two@test.local', flagged: 1 },
    ] });
    let tree;
    await act(async () => { tree = create(<BanUserScreen />); });
    const text = renderedText(tree);
    expect(text).toContain('Reported One');
    expect(text).toContain('Reported Two');
    expect(text).not.toContain('No reported users right now.');
  });

  it('Process Reviews no longer shows "Loading..." forever when the request fails', async () => {
    axios.get.mockRejectedValue({ response: undefined });
    let tree;
    await act(async () => { tree = create(<ProcessReviewsScreen />); });
    const text = renderedText(tree);
    expect(text).toContain("Can't reach the server. Check your connection and try again.");
    expect(text).not.toContain('Loading...');
    expect(text).not.toContain('Loading…');
  });
});
