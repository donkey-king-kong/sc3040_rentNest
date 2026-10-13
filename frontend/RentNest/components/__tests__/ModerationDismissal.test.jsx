import { Alert, Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BanUserScreen2 from '../../app/BanUserScreen2';
import ProcessReviewsScreen2 from '../../app/ProcessReviewsScreen2';
import ReviewListingScreen2 from '../../app/ReviewListingScreen2';
import { moderationDismissals } from '../../config/moderationDismissals';

const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('axios');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../config/api', () => ({ API_BASE_URL: 'http://test.local' }));
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: jest.fn(),
    replace: mockReplace,
  }),
  useLocalSearchParams: () => ({
    userid: '7',
    reviewid: '8',
    listingid: '9',
  }),
}));
jest.mock('../ProfileImage', () => () => null);

const details = [
  {
    type: 'users',
    id: '7',
    Screen: BanUserScreen2,
    response: { userid: 7, name: 'Reported User', email: 'user@test.local' },
    endpoint: '/api/users/setFlag/7/0',
  },
  {
    type: 'reviews',
    id: '8',
    Screen: ProcessReviewsScreen2,
    response: {
      reviewID: 8,
      title: 'Reported Review',
      text: 'Review text',
      rating: 3,
      reviewerID: 2,
      reviewerName: 'Reviewer',
    },
    endpoint: '/api/reviews/setFlag/8/false',
  },
  {
    type: 'listings',
    id: '9',
    Screen: ReviewListingScreen2,
    response: { listingID: 9, name: 'Reported Listing', ownerName: 'Owner' },
    endpoint: '/api/listings/setFlag/9/false',
  },
];

const findButton = (tree, label) => tree.root.findAll(node =>
  typeof node.props.onPress === 'function'
  && node.findAllByType(Text).some(text => text.props.children === label))[0];

beforeEach(async () => {
  jest.clearAllMocks();
  moderationDismissals.reset();
  await AsyncStorage.clear();
  await AsyncStorage.setItem('token', 'test-token');
});

it.each(details)(
  'returns immediately while the $type dismissal request is still pending',
  async ({ type, id, Screen, response, endpoint }) => {
    let finishRequest;
    axios.get.mockResolvedValue({ data: response });
    axios.put.mockImplementation(() => new Promise(resolve => {
      finishRequest = resolve;
    }));

    let tree;
    await act(async () => { tree = create(<Screen />); });
    const dismiss = findButton(tree, 'Dismiss Report').props.onPress;

    await act(async () => {
      await dismiss();
      await dismiss();
    });

    expect(axios.put).toHaveBeenCalledTimes(1);
    expect(axios.put).toHaveBeenCalledWith(
      `http://test.local${endpoint}`,
      {},
      expect.any(Object),
    );
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(moderationDismissals.isPending(type, id)).toBe(true);

    // A focus refresh may race the mutation; stale server data must stay hidden.
    moderationDismissals.reconcile(type, [id]);
    expect(moderationDismissals.isPending(type, id)).toBe(true);

    await act(async () => {
      finishRequest({ data: {} });
      await Promise.resolve();
    });
    moderationDismissals.reconcile(type, []);
    expect(moderationDismissals.isPending(type, id)).toBe(false);
  },
);

it('restores a failed dismissal and offers a retry', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  axios.get.mockResolvedValue({
    data: {
      reviewID: 8,
      title: 'Reported Review',
      text: 'Review text',
      rating: 3,
      reviewerID: 2,
      reviewerName: 'Reviewer',
    },
  });
  axios.put
    .mockRejectedValueOnce({ request: {} })
    .mockResolvedValueOnce({ data: {} });

  let tree;
  await act(async () => { tree = create(<ProcessReviewsScreen2 />); });
  await act(async () => {
    await findButton(tree, 'Dismiss Report').props.onPress();
    await Promise.resolve();
  });

  expect(moderationDismissals.isPending('reviews', '8')).toBe(false);
  expect(alert).toHaveBeenCalledWith(
    'Unable to dismiss review report',
    "Couldn't reach the server. Check your connection and try again.",
    expect.any(Array),
  );

  const retry = alert.mock.calls[0][2].find(action => action.text === 'Try Again');
  await act(async () => {
    retry.onPress();
    await Promise.resolve();
  });

  expect(axios.put).toHaveBeenCalledTimes(2);
  expect(moderationDismissals.isPending('reviews', '8')).toBe(true);
  moderationDismissals.reconcile('reviews', []);
  expect(moderationDismissals.isPending('reviews', '8')).toBe(false);
  alert.mockRestore();
});
