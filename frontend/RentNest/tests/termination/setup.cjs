global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-native', () => ({
  ...Object.fromEntries([
    'ActivityIndicator', 'Text', 'TouchableOpacity', 'View', 'TextInput',
    'KeyboardAvoidingView', 'ScrollView', 'Image', 'StatusBar', 'RefreshControl',
  ].map(name => [name, name])),
  Modal: ({ visible, children }) => visible ? children : null,
  StyleSheet: { create: styles => styles },
  Platform: { OS: 'ios' },
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  Animated: {
    Value: class {
      setValue() {}
      interpolate() { return 0; }
    },
    View: 'Animated.View',
    timing: () => ({ start: jest.fn() }),
    spring: () => ({ start: jest.fn() }),
  },
}));

jest.mock('expo-router', () => ({
  useFocusEffect: callback => require('react').useEffect(callback, [callback]),
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn() }));
jest.mock('jwt-decode', () => ({ jwtDecode: jest.fn() }));
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({ FontAwesome: 'FontAwesome' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../config/api', () => ({ API_BASE_URL: 'https://rentnest.test' }));
jest.mock('../../components/MorphingInfinity', () => 'MorphingInfinity');
jest.mock('../../components/ProfileImage', () => 'ProfileImage');
jest.mock('../../components/ListingImage', () => 'ListingImage');
jest.mock('../../components/AvatarOrb', () => 'AvatarOrb');

beforeEach(() => {
  // Keep unexpected renderer warnings visible; suppress only React 19's known deprecation.
  const original = console.error;
  jest.spyOn(console, 'error').mockImplementation((message, ...args) => {
    if (String(message).startsWith('react-test-renderer is deprecated')) return;
    original(message, ...args);
  });
  global.fetch = jest.fn(() => { throw new Error('Network access is forbidden in termination QA'); });
});

afterEach(() => {
  jest.restoreAllMocks();
});
