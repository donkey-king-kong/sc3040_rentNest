import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ModerationListState, { moderationLoadError } from '../ModerationListState';
import BanUserScreen from '../../app/BanUserScreen';
import ProcessReviewsScreen from '../../app/ProcessReviewsScreen';
import AdminScreen from '../../app/AdminScreen';

const mockPush = jest.fn();

jest.mock('axios');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../config/api', () => ({ API_BASE_URL: 'http://test.local', ENDPOINTS: {} }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

// React 19 commits test renders asynchronously unless they are wrapped in act.
const renderStatic = (element) => {
  let tree;
  act(() => { tree = create(element); });
  return tree;
};

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
    const text = renderedText(renderStatic(<ModerationListState loading emptyText="No reported users right now." />));
    expect(text).toContain('Loading…');
    expect(text).not.toContain('No reported users right now.');
  });

  it('shows an error with a retry button instead of the empty message', () => {
    const onRetry = jest.fn();
    const tree = renderStatic(<ModerationListState error="Something failed." onRetry={onRetry} emptyText="No reported users right now." />);
    const text = renderedText(tree);
    expect(text).toContain('Something failed.');
    expect(text).toContain('Try again');
    expect(text).not.toContain('No reported users right now.');
  });

  it('tells a searching admin that nothing matched, not that nothing is reported', () => {
    const text = renderedText(renderStatic(<ModerationListState searching emptyText="No reported users right now." />));
    expect(text).toContain('No results match your search.');
    expect(text).not.toContain('No reported users right now.');
  });

  it('shows the empty message when the list is genuinely empty', () => {
    const text = renderedText(renderStatic(<ModerationListState emptyText="No reported users right now." />));
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

describe('merged admin dashboard', () => {
  it('keeps analytics navigation alongside the incoming moderation counts', async () => {
    const counts = { reviews: 1, users: 2, listings: 3 };
    axios.get.mockImplementation(async (url) => {
      const type = Object.keys(counts).find(key => url.includes('/' + key + '/'));
      return { data: Array.from({ length: counts[type] }, (_, index) => ({ id: index })) };
    });
    let tree;
    await act(async () => { tree = create(<AdminScreen />); });
    const text = renderedText(tree);
    expect(text).toEqual(expect.arrayContaining(['Platform Analytics', 'Reviews', 'Users', 'Listings']));
    const analyticsButton = tree.root.findAll(node => {
      return typeof node.props.onPress === 'function'
        && node.findAllByType(Text).some(child => child.props.children === 'Platform Analytics');
    })[0];
    expect(analyticsButton).toBeDefined();
    await act(async () => { analyticsButton.props.onPress(); });
    expect(mockPush).toHaveBeenCalledWith('/AdminAnalyticsScreen');
    const allText = tree.root.findAllByType(Text).map(node => node.props.children);
    expect(allText).toEqual(expect.arrayContaining([1, 2, 3]));
  });
});

describe('admin count recovery', () => {
  it('shows unavailable counts on failure and real zero counts after retry succeeds', async () => {
    axios.get.mockRejectedValue(new Error('Network unavailable'));
    let tree;
    await act(async () => { tree = create(<AdminScreen />); });
    expect(renderedText(tree)).toContain("Some report counts couldn't be loaded.");
    expect(renderedText(tree).filter(value => value === 'Unavailable')).toHaveLength(3);
    expect(tree.root.findAllByType(Text).map(node => node.props.children)).not.toContain(0);

    axios.get.mockResolvedValue({ data: [] });
    const retry = tree.root.findAll(node => node.props.accessibilityLabel === 'Retry report counts'
      && typeof node.props.onPress === 'function')[0];
    await act(async () => { await retry.props.onPress(); });
    expect(renderedText(tree)).not.toContain("Some report counts couldn't be loaded.");
    expect(renderedText(tree)).not.toContain('Unavailable');
    expect(tree.root.findAllByType(Text).filter(node => node.props.children === 0)).toHaveLength(3);
  });
});
