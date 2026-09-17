import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import listingResponse from './fixtures/listing-response.json';
import { Circle, Path } from 'react-native-svg';
import {
  BarChart,
  LineChart,
  PERIOD_OPTIONS,
  ShareBar,
  StatTile,
  buildLastDays,
  buildPeriod,
  formatChange,
  formatValue,
  useAnalytics,
} from '../AnalyticsKit';
import ListingAnalyticsScreen from '../../../app/ListingAnalyticsScreen';

jest.mock('axios');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../../config/api', () => ({
  API_BASE_URL: 'http://test.local',
  ENDPOINTS: {
    ANALYTICS_OWNER_SUMMARY: '/api/analytics/owner/summary',
    ANALYTICS_OWNER_LISTING: (id) => `/api/analytics/owner/listings/${id}`,
    ANALYTICS_ADMIN_SUMMARY: '/api/analytics/admin/summary',
  },
}));
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({ listingId: '2' }),
}));

// Every string rendered inside a <Text>, flattened
const renderedText = (tree) => tree.root.findAllByType(Text)
  .map((node) => [].concat(node.props.children).filter((child) => typeof child === 'string' || typeof child === 'number').join(''))
  .filter(Boolean);

const available = (value, unit = 'count', basis = 'snapshot') => ({
  availability: 'available', value, unit, basis, definition: 'Test definition', reason: null,
});
const unavailable = (reason) => ({
  availability: 'unavailable', value: null, unit: 'count', basis: 'period', definition: 'Test definition', reason,
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('formatValue', () => {
  it('formats units without inventing values', () => {
    expect(formatValue(28800, 'SGD')).toBe('S$28,800');
    expect(formatValue(66.7, 'percent')).toBe('66.7%');
    expect(formatValue(50, 'percent')).toBe('50.0%');
    expect(formatValue(3, 'months')).toBe('3.0 mo');
    expect(formatValue(12, 'days')).toBe('12.0 days');
    expect(formatValue(49.2, 'percentage_points')).toBe('49.2 pts');
    expect(formatValue(4.5, 'rating_out_of_5')).toBe('4.5 / 5');
    expect(formatValue(7.5, 'months')).toBe('7.5 mo');
    expect(formatValue(1234567, 'count')).toBe('1,234,567');
    expect(formatValue(null, 'SGD')).toBe('—');
  });
});

describe('buildPeriod', () => {
  it('covers whole months with an explicit offset and stays within 366 days', () => {
    const { from, to } = buildPeriod(12);
    const isoWithOffset = /^\d{4}-\d{2}-01T00:00:00[+-]\d{2}:\d{2}$/;
    expect(from).toMatch(isoWithOffset);
    expect(to).toMatch(isoWithOffset);
    const days = (new Date(to) - new Date(from)) / 86400000;
    expect(days).toBeGreaterThan(360);
    expect(days).toBeLessThanOrEqual(366);
  });

  it('builds a last-30-days period ending at the end of today', () => {
    const { from, to } = buildLastDays(30);
    const days = Math.round((new Date(to) - new Date(from)) / 86400000);
    expect(days).toBe(30);
    expect(new Date(to).getTime()).toBeGreaterThan(Date.now());
  });

  it('offers 30 days, 3, 6 and 12 months', () => {
    expect(PERIOD_OPTIONS.map((option) => option.label)).toEqual(['30D', '3M', '6M', '12M']);
  });
});

describe('StatTile', () => {
  it('keeps the label and value when decorated with an icon and tone', () => {
    const text = renderedText(create(<StatTile icon="home" tone="blue" label="Listings" metric={available(8)} />));
    expect(text).toContain('Listings');
    expect(text).toContain('8');
  });

  it('shows a measured zero as 0', () => {
    const tree = create(<StatTile label="Listings" metric={available(0)} />);
    const text = renderedText(tree);
    expect(text).toContain('0');
    expect(text).not.toContain('Not available');
  });

  it('says when a metric only covers part of the period', () => {
    const metric = {
      ...available(3, 'count', 'period'),
      coverage: { start: '2026-09-16T18:26:00Z', end: '2026-10-01T00:00:00Z', complete: false },
    };
    const text = renderedText(create(<StatTile label="Offers sent" metric={metric} />));
    expect(text.some((item) => item.startsWith('Tracked since '))).toBe(true);
    expect(text).not.toContain('Selected period');
  });

  it('labels a fully covered period metric normally', () => {
    const metric = {
      ...available(3, 'count', 'period'),
      coverage: { start: '2026-01-01T00:00:00Z', end: '2026-04-01T00:00:00Z', complete: true },
    };
    expect(renderedText(create(<StatTile label="Offers sent" metric={metric} />))).toContain('Selected period');
  });

  it('shows a change line only when the change could be calculated', () => {
    const withChange = renderedText(create(<StatTile label="New users" metric={available(2)} change={available(100, 'percent', 'period')} />));
    expect(withChange).toContain('+100.0% vs previous period');

    const withoutChange = renderedText(create(<StatTile label="New users" metric={available(2)} change={unavailable('Needs the previous period.')} />));
    expect(withoutChange.some((item) => item.includes('vs previous period'))).toBe(false);
  });

  it('shows unavailable metrics as not available with the reason, never 0', () => {
    const tree = create(<StatTile label="Listing views" metric={unavailable('Not tracked yet.')} />);
    const text = renderedText(tree);
    expect(text).toContain('Not available');
    expect(text).toContain('Not tracked yet.');
    expect(text).not.toContain('0');
  });
});

describe('formatChange', () => {
  it('signs increases and decreases', () => {
    expect(formatChange(available(12.5, 'percent'))).toBe('+12.5% vs previous period');
    expect(formatChange(available(-40, 'percent'))).toBe('-40.0% vs previous period');
    expect(formatChange(available(0, 'percent'))).toBe('0.0% vs previous period');
    expect(formatChange(unavailable('No previous data.'))).toBeNull();
    expect(formatChange(available(49.2, 'percentage_points'))).toBe('+49.2 pts vs previous period');
  });
});

describe('BarChart', () => {
  it('shows the empty message when every bucket is zero', () => {
    const series = {
      availability: 'available', unit: 'SGD', basis: 'period', definition: '', reason: null,
      points: [{ bucket: '2026-01', value: 0 }, { bucket: '2026-02', value: 0 }],
    };
    const text = renderedText(create(<BarChart series={series} emptyText="No rent recorded in this period" />));
    expect(text).toContain('No rent recorded in this period');
  });

  it('still shows the empty message on a fixed 0-100% scale', () => {
    const series = {
      availability: 'available', unit: 'percent', basis: 'period', definition: '', reason: null,
      points: [{ bucket: '2026-01', value: 0 }],
    };
    const text = renderedText(create(<BarChart series={series} emptyText="No occupancy in this period" maxValue={100} />));
    expect(text).toContain('No occupancy in this period');
    expect(text).toContain('100.0%');
  });

  it('shows an unavailable series as not available', () => {
    const series = { availability: 'unavailable', unit: 'count', basis: 'period', reason: 'Not tracked yet.', points: [] };
    const text = renderedText(create(<BarChart series={series} emptyText="unused" />));
    expect(text).toContain('Not available');
    expect(text).toContain('Not tracked yet.');
  });
});

describe('LineChart', () => {
  const series = {
    availability: 'available', unit: 'percent', basis: 'period', definition: '', reason: null,
    points: [{ bucket: '2026-01', value: 33.3 }, { bucket: '2026-02', value: 66.7 }, { bucket: '2026-03', value: 66.7 }],
  };

  const measure = async (tree, width) => {
    const plot = tree.root.findAll((node) => typeof node.props.onLayout === 'function')[0];
    await act(async () => { plot.props.onLayout({ nativeEvent: { layout: { width } } }); });
  };

  it('draws one line and a marker per point once it knows its width', async () => {
    let tree;
    await act(async () => { tree = create(<LineChart series={series} emptyText="unused" maxValue={100} />); });
    expect(tree.root.findAllByType(Circle)).toHaveLength(0);

    await measure(tree, 300);
    expect(tree.root.findAllByType(Circle)).toHaveLength(3);
    // Area fill and the line itself
    expect(tree.root.findAllByType(Path)).toHaveLength(2);
    expect(renderedText(tree)).toContain('100.0%');
  });

  it('shows a point value when tapped', async () => {
    let tree;
    await act(async () => { tree = create(<LineChart series={series} emptyText="unused" maxValue={100} />); });
    await measure(tree, 300);
    expect(renderedText(tree)).toContain('Tap a point to see its value');

    const target = tree.root.findAll((node) => node.props.accessibilityLabel === 'Feb 2026: 66.7%' && typeof node.props.onPress === 'function')[0];
    await act(async () => { target.props.onPress(); });
    expect(renderedText(tree)).toContain('Feb 2026: 66.7%');
  });

  it('shows the empty message and an unavailable series truthfully', () => {
    const empty = { ...series, points: [{ bucket: '2026-01', value: 0 }] };
    expect(renderedText(create(<LineChart series={empty} emptyText="No occupancy in this period" />))).toContain('No occupancy in this period');

    const unavailableSeries = { availability: 'unavailable', unit: 'percent', basis: 'period', reason: 'No listings.', points: [] };
    const text = renderedText(create(<LineChart series={unavailableSeries} emptyText="unused" />));
    expect(text).toContain('Not available');
    expect(text).toContain('No listings.');
  });
});

describe('ShareBar', () => {
  it('labels every group with its count and share, including empty groups', () => {
    const series = {
      availability: 'available', unit: 'count', basis: 'snapshot', definition: '', reason: null,
      points: [
        { bucket: 'Owners only', value: 2 },
        { bucket: 'Tenants only', value: 2 },
        { bucket: 'Both', value: 0 },
        { bucket: 'Neither', value: 4 },
      ],
    };
    const text = renderedText(create(<ShareBar series={series} emptyText="No users yet" />));
    expect(text).toContain('8 in total');
    expect(text).toContain('Owners only');
    expect(text).toContain('2 · 25.0%');
    expect(text).toContain('0 · 0.0%');
    expect(text).toContain('4 · 50.0%');
  });

  it('says when there is nothing to show', () => {
    const series = { availability: 'available', unit: 'count', basis: 'snapshot', points: [{ bucket: 'Neither', value: 0 }] };
    expect(renderedText(create(<ShareBar series={series} emptyText="No users yet" />))).toContain('No users yet');
  });
});

describe('useAnalytics', () => {
  let latest;
  const Probe = ({ path }) => {
    latest = useAnalytics(path, '12M');
    return null;
  };

  it('sends the stored token and a period, then exposes the data', async () => {
    await AsyncStorage.setItem('token', 'test-token');
    axios.get.mockResolvedValue({ data: listingResponse });

    await act(async () => { create(<Probe path="/api/analytics/owner/listings/2" />); });

    expect(axios.get).toHaveBeenCalledWith(
      'http://test.local/api/analytics/owner/listings/2',
      expect.objectContaining({
        params: expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
    expect(latest.loading).toBe(false);
    expect(latest.data).toEqual(listingResponse);
    expect(latest.error).toBeNull();
  });

  it('turns a 404 into a readable message without data', async () => {
    await AsyncStorage.setItem('token', 'test-token');
    axios.get.mockRejectedValue({ response: { status: 404, data: { error: 'NOT_FOUND' } } });

    await act(async () => { create(<Probe path="/api/analytics/owner/listings/999" />); });

    expect(latest.data).toBeNull();
    expect(latest.error).toBe("This listing wasn't found.");
  });

  it('reports a server failure as an error, not as empty data', async () => {
    await AsyncStorage.setItem('token', 'test-token');
    axios.get.mockRejectedValue({ response: { status: 500 } });

    await act(async () => { create(<Probe path="/api/analytics/owner/summary" />); });

    expect(latest.data).toBeNull();
    expect(latest.error).toBe('Something went wrong while loading analytics.');
  });

  it('flags a missing token as unauthenticated without calling the API', async () => {
    await act(async () => { create(<Probe path="/api/analytics/owner/summary" />); });

    expect(axios.get).not.toHaveBeenCalled();
    expect(latest.unauthenticated).toBe(true);
  });
});

describe('ListingAnalyticsScreen', () => {
  // The first full-screen render loads many React Native modules
  jest.setTimeout(30000);

  const pressTab = async (tree, name) => {
    const tab = tree.root.findAll((node) => node.props.accessibilityLabel === `${name} tab` && typeof node.props.onPress === 'function')[0];
    await act(async () => { tab.props.onPress(); });
  };

  it('renders the real backend response across its tabs', async () => {
    await AsyncStorage.setItem('token', 'test-token');
    axios.get.mockResolvedValue({ data: listingResponse });

    let tree;
    await act(async () => { tree = create(<ListingAnalyticsScreen />); });

    // Overview
    let text = renderedText(tree);
    expect(text).toContain('A2');
    expect(text).toContain('Vacant');
    expect(text).toContain('S$1,500');
    expect(text).toContain('65.6%');
    expect(text).toContain('3.0 mo');
    // Listing views (not tracked) and days on market must not render as numbers
    expect(text.filter((item) => item === 'Not available')).toHaveLength(2);
    // No previous-period data in this response, so no change lines
    expect(text.some((item) => item.includes('vs previous period'))).toBe(false);

    // Offers: period counts predate tracking; acceptance rate from all-time records
    await pressTab(tree, 'Offers');
    text = renderedText(tree);
    expect(text.filter((item) => item === 'Not available')).toHaveLength(2);
    expect(text).toContain('Not tracked for this period: these dates are recorded from 17 Sep 2026 onwards.');
    expect(text).toContain('100.0%');

    // Occupancy
    await pressTab(tree, 'Occupancy');
    text = renderedText(tree);
    expect(text).toContain('Occupied 2 of 3 months');
  });

  it('shows a retryable error when the request fails', async () => {
    await AsyncStorage.setItem('token', 'test-token');
    axios.get.mockRejectedValue({ response: undefined });

    let tree;
    await act(async () => { tree = create(<ListingAnalyticsScreen />); });
    const text = renderedText(tree);

    expect(text).toContain("Can't reach the server. Check your connection and try again.");
    expect(text).toContain('Try again');
  });
});
