import React from 'react';
import { Modal, Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ModerationListState, { moderationLoadError } from '../ModerationListState';
import BanUserScreen from '../../app/BanUserScreen';
import BanUserScreen3 from '../../app/BanUserScreen3';
import ProcessReviewsScreen from '../../app/ProcessReviewsScreen';
import ProcessReviewsScreen2 from '../../app/ProcessReviewsScreen2';
import AdminScreen from '../../app/AdminScreen';
import ReviewListingScreen from '../../app/ReviewListingScreen';
import ReviewListingScreen3 from '../../app/ReviewListingScreen3';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockSetParams = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace, back: mockBack, setParams: mockSetParams };
const mockFocus = { enter: null, leave: null };

jest.mock('axios');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../config/api', () => ({ API_BASE_URL: 'http://test.local', ENDPOINTS: {} }));
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ reviewid: '7' }),
  useFocusEffect: (effect) => require('react').useEffect(() => {
    let cleanup;
    const leave = () => { cleanup?.(); cleanup = null; };
    mockFocus.leave = leave;
    mockFocus.enter = () => { cleanup = effect(); };
    mockFocus.enter();
    return leave;
  }, [effect]),
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

describe('ban success confirmation', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it.each(['automatic dismissal', 'native dismissal'])('returns to admin using %s', async action => {
    let tree;
    await act(async () => { tree = create(<BanUserScreen3 />); });
    expect(renderedText(tree)).toContain('User Banned');
    if (action === 'native dismissal') {
      await act(async () => tree.root.findByType(Modal).props.onRequestClose());
    } else {
      await act(async () => jest.advanceTimersByTime(1999));
      expect(mockReplace).not.toHaveBeenCalled();
      await act(async () => jest.advanceTimersByTime(1));
    }
    expect(mockReplace).toHaveBeenCalledWith('/AdminScreen');
    await act(async () => tree.unmount());
    await act(async () => jest.runOnlyPendingTimers());
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
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


describe('review moderation refresh on return', () => {
  const review = { reviewID: 7, title: 'Reported review', text: 'Review text', rating: 3,
    reviewerID: 2, reviewerName: 'Reviewer', flagged: true };

  it.each([
    ['reviews', ProcessReviewsScreen, 'Dismiss Report'],
    ['reviews', ProcessReviewsScreen, 'Delete Review'],
    ['admin counts', AdminScreen, 'Dismiss Report'],
    ['admin counts', AdminScreen, 'Delete Review'],
  ])('refreshes mounted %s after %s action', async (name, Screen, label) => {
    let reported = true;
    axios.get.mockImplementation(async url => ({ data: url.endsWith('/admin/flagged')
      ? (url.includes('/reviews/') && reported ? [review] : []) : review }));
    axios.put.mockImplementation(async () => { reported = false; return { data: {} }; });
    axios.delete.mockImplementation(async () => { reported = false; return { status: 204 }; });
    let tree, detail;
    await act(async () => { tree = create(<Screen />); });
    if (name === 'reviews') expect(renderedText(tree)).toContain('Reported review');
    else expect(tree.root.findAllByType(Text).map(node => node.props.children)).toContain(1);
    await act(async () => { mockFocus.leave(); detail = create(<ProcessReviewsScreen2 />); });
    const button = detail.root.findAll(node => typeof node.props.onPress === 'function'
      && node.findAllByType(Text).some(text => text.props.children === label))[0];
    await act(async () => { await button.props.onPress(); });
    if (label === 'Dismiss Report') {
      expect(axios.put).toHaveBeenCalledWith('http://test.local/api/reviews/setFlag/7/false', {}, expect.any(Object));
      expect(mockBack).toHaveBeenCalled();
      expect(mockSetParams).not.toHaveBeenCalled();
    } else {
      expect(axios.delete).toHaveBeenCalledWith('http://test.local/api/reviews/7', expect.any(Object));
      expect(mockBack).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    }
    await act(async () => { mockFocus.enter(); });
    if (name === 'reviews') {
      expect(renderedText(tree)).not.toContain('Reported review');
      expect(renderedText(tree)).toContain('No reported reviews right now.');
    } else {
      const values = tree.root.findAllByType(Text).map(node => node.props.children);
      expect(values).not.toContain(1);
      expect(values.filter(value => value === 0)).toHaveLength(3);
    }
    expect(axios.get.mock.calls.filter(([url]) => url.endsWith('/admin/flagged'))).toHaveLength(name === 'reviews' ? 2 : 6);
    await act(async () => { detail.unmount(); tree.unmount(); });
  });

  it.each([['reviews', ProcessReviewsScreen], ['admin counts', AdminScreen]])(
    'ignores a stale response after refreshing %s', async (name, Screen) => {
      let resolveOld;
      let old = true;
      axios.get.mockImplementation(url => {
        if (old && url.includes('/reviews/')) return new Promise(resolve => { resolveOld = resolve; });
        return Promise.resolve({ data: [] });
      });
      let tree;
      await act(async () => { tree = create(<Screen />); });
      await act(async () => { mockFocus.leave(); old = false; mockFocus.enter(); });
      await act(async () => { resolveOld({ data: [review] }); });
      if (name === 'reviews') {
        expect(renderedText(tree)).toContain('No reported reviews right now.');
        expect(renderedText(tree)).not.toContain('Reported review');
      } else {
        expect(tree.root.findAllByType(Text).filter(node => node.props.children === 0)).toHaveLength(3);
        expect(tree.root.findAllByType(Text).map(node => node.props.children)).not.toContain(1);
      }
      await act(async () => tree.unmount());
    });
});


describe('listing deletion returns to refreshed listings', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it.each(['automatic dismissal', 'native dismissal'])('returns to Review Listings using %s', async action => {
    axios.get.mockResolvedValue({ data: [{ listingID: 72, name: 'Courtyard Flat', ownerName: 'Owner' }] });
    let list, notification;
    await act(async () => { list = create(<ReviewListingScreen />); });
    expect(renderedText(list)).toContain('Courtyard Flat');
    await act(async () => { mockFocus.leave(); notification = create(<ReviewListingScreen3 />); });
    expect(renderedText(notification)).toContain('Listing Deleted');
    if (action === 'native dismissal') {
      await act(async () => notification.root.findByType(Modal).props.onRequestClose());
    } else {
      await act(async () => jest.advanceTimersByTime(1999));
      expect(mockReplace).not.toHaveBeenCalled();
      await act(async () => jest.advanceTimersByTime(1));
    }
    expect(mockReplace).toHaveBeenCalledWith('/ReviewListingScreen');
    expect(mockReplace).not.toHaveBeenCalledWith('/AdminScreen');
    await act(async () => notification.unmount());
    axios.get.mockResolvedValue({ data: [] });
    await act(async () => { mockFocus.enter(); });
    expect(renderedText(list)).not.toContain('Courtyard Flat');
    expect(renderedText(list)).toContain('No reported listings right now.');
    expect(axios.get).toHaveBeenCalledTimes(2);
    await act(async () => { list.unmount(); jest.runOnlyPendingTimers(); });
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});
