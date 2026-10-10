import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import listingResponse from './fixtures/listing-response.json';
import { Circle, Path } from 'react-native-svg';
import {
  PeriodSelector,
  chartMaximum,
  BarChart,
  CountBarChart,
  DonutChart,
  PieChart,
  MetricRow,
  LineChart,
  PERIOD_OPTIONS,
  ShareBar,
  StatTile,
  buildLastDays,
  buildPastYear,
  buildPeriod,
  formatPeriodRange,
  formatChange,
  formatValue,
  useAnalytics,
} from '../AnalyticsKit';
import ListingAnalyticsScreen from '../../../app/ListingAnalyticsScreen';
import AdminAnalyticsScreen from '../../../app/AdminAnalyticsScreen';
import { AdminLoadingState } from '../../AdminUI';

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
// React 19 commits test renders asynchronously unless they are wrapped in act.
const renderStatic = (element) => {
  let tree;
  act(() => { tree = create(element); });
  return tree;
};

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
    expect(formatValue(4.5, 'rating_out_of_5')).toBe('4.5 / 5.0');
    expect(formatValue(7.5, 'months')).toBe('7.5 mo');
    expect(formatValue(1234567, 'count')).toBe('1,234,567');
    expect(formatValue(null, 'SGD')).toBe('—');
  });
});

describe('buildPeriod', () => {
  it('includes the current Singapore month and previous eleven months through now', () => {
    const now = new Date('2026-09-30T17:00:00Z');
    const range = buildPastYear(now);
    expect(range.from).toBe('2025-11-01T00:00:00+08:00');
    expect(range.to).toBe('2026-10-01T01:00:00.000+08:00');
    expect(new Date(range.to).getTime()).toBe(now.getTime());
  });
  it('covers whole months with an explicit offset and stays within 366 days', () => {
    const { from, to } = buildPeriod(12);
    const isoWithOffset = /^\d{4}-\d{2}-01T00:00:00[+-]\d{2}:\d{2}$/;
    expect(from).toMatch(isoWithOffset);
    expect(to).toMatch(isoWithOffset);
    const days = (new Date(to) - new Date(from)) / 86400000;
    expect(days).toBeGreaterThan(360);
    expect(days).toBeLessThanOrEqual(366);
  });

  it('covers 30 Singapore calendar dates through the current instant', () => {
    const now = new Date('2026-10-05T18:09:00Z');
    const { from, to } = buildLastDays(30, now);
    expect(from).toBe('2026-09-07T00:00:00+08:00');
    expect(to).toBe('2026-10-06T02:09:00.000+08:00');
    expect(new Date(to).getTime()).toBe(now.getTime());
  });
  it('uses completed months without including future days', () => {
    const now = new Date('2026-10-05T18:09:00Z');
    expect(buildPeriod(3, now)).toEqual({ from: '2026-07-01T00:00:00+08:00', to: '2026-10-01T00:00:00+08:00' });
    expect(buildPeriod(1, new Date('2026-09-30T17:00:00Z'))).toEqual({ from: '2026-09-01T00:00:00+08:00', to: '2026-10-01T00:00:00+08:00' });
  });
  it('offers the five simple preset choices', () => {
    expect(PERIOD_OPTIONS.map(option => option.key)).toEqual(['1M', '2M', '3M', '6M', '12M', 'LIFETIME']);
  });

});

describe('StatTile', () => {
  it('keeps the label and value for a featured overview metric', () => {
    const text = renderedText(renderStatic(<StatTile featured label="Listings" metric={available(8)} />));
    expect(text).toContain('Listings');
    expect(text).toContain('8');
  });

  it('shows a measured zero as 0', () => {
    const tree = renderStatic(<StatTile label="Listings" metric={available(0)} />);
    const text = renderedText(tree);
    expect(text).toContain('0');
    expect(text).not.toContain('Not available');
  });

  it('hides redundant period scope without adding legacy coverage explanations', () => {
    const metric = {
      ...available(3, 'count', 'period'),
      coverage: { start: '2026-09-16T18:26:00Z', end: '2026-10-01T00:00:00Z', complete: false },
    };
    const text = renderedText(renderStatic(<StatTile label="Offers sent" metric={metric} />));
    expect(text).not.toContain('Period');
    expect(text.some((item) => item.startsWith('Tracked since '))).toBe(false);
  });

  it('hides redundant period scope for fully covered metrics', () => {
    const metric = {
      ...available(3, 'count', 'period'),
      coverage: { start: '2026-01-01T00:00:00Z', end: '2026-04-01T00:00:00Z', complete: true },
    };
    expect(renderedText(renderStatic(<StatTile label="Offers sent" metric={metric} />))).not.toContain('Period');
  });

  it('shows a change line only when the change could be calculated', () => {
    const withChange = renderedText(renderStatic(<StatTile label="New users" metric={available(2)} change={available(100, 'percent', 'period')} />));
    expect(withChange).toContain('+100.0% vs previous period');

    const withoutChange = renderedText(renderStatic(<StatTile label="New users" metric={available(2)} change={unavailable('Needs the previous period.')} />));
    expect(withoutChange.some((item) => item.includes('vs previous period'))).toBe(false);
  });

  it('shows unavailable metrics as not available with the reason, never 0', () => {
    const tree = renderStatic(<StatTile label="Listing views" metric={unavailable('Not tracked yet.')} />);
    const text = renderedText(tree);
    expect(text).toContain('Not available');
    expect(text).not.toContain('Not tracked yet.');
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
  it('keeps missing monthly averages as gaps with a clean chart header', async () => {
    const series = { availability: 'available', unit: 'days', basis: 'period', points: [
      { bucket: '2026-01', value: 10 }, { bucket: '2026-02', value: null }, { bucket: '2026-03', value: 14 },
    ] };
    let tree;
    await act(async () => { tree = create(<BarChart title="Average days on market" series={series} cleanHeader hidePeriodLabel />); });
    expect(renderedText(tree)).toContain('Average days on market');
    expect(renderedText(tree)).not.toContain('days');
    expect(renderedText(tree)).not.toContain('Period');
    const gap = tree.root.findAll(node => node.props.accessibilityLabel === 'Feb 2026: —' && node.props.onPress)[0];
    expect(gap).toBeDefined();
    expect(gap.findAll(node => Array.isArray(node.props.style)
      && node.props.style.some(style => typeof style?.height === 'string' && style.height.endsWith('%')))).toHaveLength(0);
    await act(async () => gap.props.onPress());
    expect(renderedText(tree)).toContain('Feb 2026\n—');
  });

  it('shows the empty message when every bucket is zero', () => {
    const series = {
      availability: 'available', unit: 'SGD', basis: 'period', definition: '', reason: null,
      points: [{ bucket: '2026-01', value: 0 }, { bucket: '2026-02', value: 0 }],
    };
    const text = renderedText(renderStatic(<BarChart series={series} emptyText="No rent recorded in this period" />));
    expect(text).toContain('No rent recorded in this period');
  });

  it('still shows the empty message on a fixed 0-100% scale', () => {
    const series = {
      availability: 'available', unit: 'percent', basis: 'period', definition: '', reason: null,
      points: [{ bucket: '2026-01', value: 0 }],
    };
    const text = renderedText(renderStatic(<BarChart series={series} emptyText="No occupancy in this period" maxValue={100} />));
    expect(text).toContain('No occupancy in this period');
    expect(text).toContain('100.0%');
  });

  it('shows an unavailable series as not available', () => {
    const series = { availability: 'unavailable', unit: 'count', basis: 'period', reason: 'Not tracked yet.', points: [] };
    const text = renderedText(renderStatic(<BarChart series={series} emptyText="unused" />));
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
    expect(renderedText(tree)).not.toContain('%');

    const target = tree.root.findAll((node) => node.props.accessibilityLabel === 'Feb 2026: 66.7%' && typeof node.props.onPress === 'function')[0];
    await act(async () => { target.props.onPress(); });
    expect(renderedText(tree)).toContain('Feb 2026\n66.7%');
  });

  it('anchors tooltips inside the plot edges and toggles them off', async () => {
    let tree;
    await act(async () => { tree = create(<LineChart series={series} maxValue={100} />); });
    await measure(tree, 300);
    const tap = async label => {
      const point = tree.root.findAll(node => node.props.accessibilityLabel === label && node.props.onPress)[0];
      await act(async () => point.props.onPress());
    };
    const tooltip = () => tree.root.findAll(node => node.props.pointerEvents === 'none' && node.props.accessibilityLiveRegion === 'polite')[0];
    await tap('Jan 2026: 33.3%');
    expect(tooltip().props.style[1].left).toBe(0);
    await tap('Mar 2026: 66.7%');
    const bounds = tooltip().props.style[1];
    expect(bounds.left + bounds.width).toBeLessThanOrEqual(300);
    await tap('Mar 2026: 66.7%');
    expect(tooltip()).toBeUndefined();
  });

  it('draws gaps for missing averages without zero markers or connecting lines', async () => {
    let tree;
    const gaps = { ...series, unit: 'days', points: [
      { bucket: '2026-01', value: 10 }, { bucket: '2026-02', value: null }, { bucket: '2026-03', value: 14 },
    ] };
    await act(async () => { tree = create(<LineChart series={gaps} emptyText="No valid dates" />); });
    await measure(tree, 300);
    expect(tree.root.findAllByType(Circle)).toHaveLength(2);
    const line = tree.root.findAllByType(Path)[0];
    expect(line.props.d).not.toContain('L');
  });

  it('uses both rental series for the scale and reads both values when tapped', async () => {
    let tree;
    const accepted = { ...series, unit: 'count', points: [{ bucket: '2026-01', value: 2 }] };
    const terminated = { ...accepted, points: [{ bucket: '2026-01', value: 8 }] };
    await act(async () => { tree = create(<LineChart series={accepted} seriesLabel="Offers accepted"
      comparisonSeries={terminated} comparisonLabel="Terminations" />); });
    await measure(tree, 300);
    expect(tree.root.findAllByType(Circle)).toHaveLength(2);
    expect(renderedText(tree)).toContain('Terminations');
    const target = tree.root.findAll(node => node.props.accessibilityLabel === 'Jan 2026: Offers accepted: 2; Terminations: 8' && node.props.onPress)[0];
    await act(async () => target.props.onPress());
    expect(renderedText(tree)).toContain('Jan 2026\nOffers accepted: 2\nTerminations: 8');
  });

  it('uses whole-number count ticks and removes unit captions from clean headers', async () => {
    let tree;
    const counts = { ...series, unit: 'count', points: [{ bucket: '2026-01', value: 1 }] };
    await act(async () => { tree = create(<LineChart title="Rental activity" series={counts} cleanHeader hidePeriodLabel />); });
    await measure(tree, 300);
    expect(renderedText(tree)).toEqual(expect.arrayContaining(['Rental activity', '1', '0']));
    expect(renderedText(tree)).not.toContain('count');
    expect(renderedText(tree)).not.toContain('Period');
    expect(renderedText(tree)).not.toContain('0.25');
    await act(async () => { tree.update(<LineChart title="Average days on market" cleanHeader hidePeriodLabel
      series={{ ...counts, unit: 'days', points: [{ bucket: '2026-01', value: 10 }] }} />); });
    expect(renderedText(tree)).not.toContain('days');
    expect(renderedText(tree)).not.toContain('10.0 days');
  });

  it('shows the empty message and an unavailable series truthfully', () => {
    const empty = { ...series, points: [{ bucket: '2026-01', value: 0 }] };
    expect(renderedText(renderStatic(<LineChart series={empty} emptyText="No occupancy in this period" />))).toContain('No occupancy in this period');

    const unavailableSeries = { availability: 'unavailable', unit: 'percent', basis: 'period', reason: 'No listings.', points: [] };
    const text = renderedText(renderStatic(<LineChart series={unavailableSeries} emptyText="unused" />));
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
    const text = renderedText(renderStatic(<ShareBar series={series} emptyText="No users yet" />));
    expect(text).toContain('8 in total');
    expect(text).toContain('Owners only');
    expect(text).toContain('2 · 25.0%');
    expect(text).toContain('0 · 0.0%');
    expect(text).toContain('4 · 50.0%');
  });

  it('says when there is nothing to show', () => {
    const series = { availability: 'available', unit: 'count', basis: 'snapshot', points: [{ bucket: 'Neither', value: 0 }] };
    expect(renderedText(renderStatic(<ShareBar series={series} emptyText="No users yet" />))).toContain('No users yet');
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


  it('renders activity, payments, occupancy and date-dependent metrics on one page', async () => {
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
    // Empty historical view counts are measured zeros; missing publication dates
    // still make days on market unavailable.
    expect(text).toContain('Unique Viewers');
    expect(text.filter((item) => item === 'Not available')).toHaveLength(1);
    expect(text.filter((item) => item === '0').length).toBeGreaterThanOrEqual(2);
    expect(text.some(value => value.includes('vs previous period'))).toBe(false);
    expect(text.some((item) => item.startsWith('Tracked since '))).toBe(false);

    // Offers: empty period events remain zero alongside the other sections.
    text = renderedText(tree);
    expect(text.filter((item) => item === 'Not available')).toHaveLength(1);
    expect(text.filter((item) => item === '0').length).toBeGreaterThanOrEqual(2);
    expect(text.some((item) => item.startsWith('Tracked since '))).toBe(false);
    expect(text).toContain('Acceptance Rate');
    expect(text).toEqual(expect.arrayContaining(['Offers Sent', 'Offers Accepted']));
    expect(text).not.toContain('Tenancies ended');

    // Occupancy
    text = renderedText(tree);
    expect(text).toContain('Monthly Occupancy');
    expect(text).toContain('Occupied means a tenancy overlapped at least part of the month.');
    expect(tree.root.findAll(node => node.props.accessibilityLabel === 'February 2026: Occupied').length).toBeGreaterThan(0);
    expect(text).toContain('3.0 mo');
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

it('one admin refresh replaces all overview, rental, user and trend data', async () => {
  await AsyncStorage.setItem('token', 'test-token');
  const response = version => {
    const metric = value => available(value);
    const trend = value => ({ availability: 'available', basis: 'period', unit: 'count',
      points: [{ bucket: '2026-09', value }] });
    return { ...listingResponse, metrics: { ...listingResponse.metrics,
      registeredUserCount: metric(10 * version), listingCount: metric(3 * version),
      lifetimeRecordedRentPaymentTotal: available(1000 * version, 'SGD'),
      activeRentalRecordCount: metric(version), rentalRecordCount: metric(4 * version),
      upcomingRentalRecordCount: metric(0), expiredRentalRecordCount: metric(0), unclassifiedRentalRecordCount: metric(0),
      expiredTenantUserCount: metric(version), terminatedTenantUserCount: metric(0),
      acceptedRentalRecordCount: metric(2 * version), pendingRentalRecordCount: metric(2 * version),
      terminatedRentalRecordCount: metric(version), ownerUserCount: metric(version),
      currentTenantUserCount: metric(version), pastTenantUserCount: metric(version),
      bannedUserCount: metric(version), flaggedListingCount: metric(version),
      flaggedUserCount: metric(version), flaggedReviewCount: metric(version),
    }, series: { ...listingResponse.series,
      monthlyRecordedRentPayments: { ...trend(1000 * version), unit: 'SGD' },
      monthlyOffersAccepted: trend(2 * version), monthlyTerminations: trend(version),
      monthlyAverageDaysOnMarket: { ...trend(3 * version), unit: 'days' },
    } };
  };
  const initial = response(1);
  const refreshed = response(2);
  axios.get.mockResolvedValueOnce({ data: initial });
  let finishRefresh;
  axios.get.mockImplementationOnce(() => new Promise(resolve => { finishRefresh = resolve; }));
  let tree;
  await act(async () => { tree = create(<AdminAnalyticsScreen />); });
  const refreshButton = () => tree.root.findAll(node => node.props.accessibilityLabel === 'Refresh analytics' && node.props.onPress)[0];
  await act(async () => refreshButton().props.onPress());
  expect(axios.get).toHaveBeenCalledTimes(2);
  expect(tree.root.findByType(AdminLoadingState).props.message).toBeNull();
  [StatTile, PieChart, CountBarChart, LineChart, BarChart].forEach(component => {
    expect(tree.root.findAllByType(component)).toHaveLength(0);
  });
  expect(refreshButton().props.disabled).toBe(true);
  expect(renderedText(tree)).toContain('Platform Analytics');
  expect(renderedText(tree)).toContain('Overview');
  await act(async () => finishRefresh({ data: refreshed }));
  const tiles = tree.root.findAllByType(StatTile);
  expect(tiles.map(node => node.props.metric.value)).toEqual([20, 6, 2000, 2]);
  const pies = tree.root.findAllByType(PieChart);
  expect(pies.find(node => node.props.title === 'Rentals').props.totalMetric.value).toBe(8);
  expect(pies.find(node => node.props.title === 'User Accounts').props.totalMetric.value).toBe(20);
  const bars = tree.root.findAllByType(CountBarChart);
  expect(bars.find(node => node.props.title === 'Property and Tenancy Activity').props.series.points.map(point => point.value)).toEqual([2, 2, 2, 0]);
  expect(bars.find(node => node.props.title === 'Reported records')).toBeUndefined();
  const lines = tree.root.findAllByType(LineChart);
  expect(lines.find(node => node.props.title === 'Monthly Rent Recorded').props.series).toBe(refreshed.series.monthlyRecordedRentPayments);
  const activity = lines.find(node => node.props.title === 'Monthly Rental Activity');
  expect(activity.props.series).toBe(refreshed.series.monthlyOffersAccepted);
  expect(activity.props.comparisonSeries).toBe(refreshed.series.monthlyTerminations);
  expect(tree.root.findByType(BarChart).props.series).toBe(refreshed.series.monthlyAverageDaysOnMarket);
  expect(refreshButton().props.disabled).toBe(false);
  await act(async () => tree.unmount());
});

describe('Admin user presentation', () => {
  it.each([CountBarChart, PieChart])('places titled chart details in the header and hides the total row icon', async Chart => {
    const definition = 'Pending offers await a response. Active offers have been accepted.';
    let tree;
    await act(async () => { tree = create(<Chart title="Rentals" series={{ availability: 'available',
      unit: 'count', basis: 'snapshot', definition, points: [{ bucket: 'Active', value: 2 }] }}
      totalMetric={available(2)} totalLabel="Total Rental Offers" showReadout={false} />); });
    expect(tree.root.findByType(MetricRow).props.showInfo).toBe(false);
    const info=tree.root.findAll(node=>node.props.accessibilityLabel==='Chart calculation details' && node.props.onPress);
    expect(info).toHaveLength(1);
    await act(async () => info[0].props.onPress());
    expect(renderedText(tree)).toContain(definition);
    expect(renderedText(tree)).not.toContain('Chart calculation');
    await act(async () => tree.unmount());
  });

  it('shows the donut total and counts and percentages, including zero groups', () => {
    const series = { availability: 'available', points: [{ bucket: 'Owners', value: 2 }, { bucket: 'Tenants', value: 6 }, { bucket: 'Neither', value: 0 }] };
    const tree = renderStatic(<DonutChart series={series} emptyText="No users yet" />);
    expect(renderedText(tree)).toEqual(expect.arrayContaining(['8', 'Total users', 'Owners', '2 (25.0%)', '6 (75.0%)', '0 (0.0%)']));
    const segments = tree.root.findAllByType(Circle).filter(node => node.props.strokeDasharray);
    expect(segments).toHaveLength(2);
    expect(segments.every(node => Number.isFinite(node.props.strokeDashoffset))).toBe(true);
  });
  it('handles empty and unavailable distribution data', () => {
    expect(renderedText(renderStatic(<DonutChart series={{ availability: 'available', points: [] }} emptyText="No users yet" />))).toContain('No users yet');
    expect(renderedText(renderStatic(<DonutChart series={{ availability: 'unavailable', reason: 'No tracking data' }} />))).toEqual(expect.arrayContaining(['Not available', 'No tracking data']));
  });
  it('retains growth comparisons and tappable metric definitions', async () => {
    const tree = renderStatic(<MetricRow label="New users" metric={{ ...available(0), definition: 'Accounts created in the selected period.' }} change={available(20, 'percent')} />);
    expect(renderedText(tree)).toEqual(expect.arrayContaining(['New users', '0', '+20.0% vs previous period']));
    const target = tree.root.findAll(node => node.props.accessibilityLabel === 'New users: 0' && typeof node.props.onPress === 'function')[0];
    await act(async () => target.props.onPress());
    expect(renderedText(tree)).toContain('Accounts created in the selected period.');
    expect(renderedText(renderStatic(<MetricRow label="New listings" metric={unavailable('No tracking data')} />))).toContain('Not available');
  });
});

it('uses readable chart bounds without clipping values', () => {
  expect(chartMaximum(2400)).toBe(5000);
  expect(chartMaximum(0)).toBe(1);
  expect(chartMaximum(100)).toBe(100);
});

it('shows exact tenancy counts including zero buckets and keeps empty and unavailable states truthful', () => {
  const series = { availability: 'available', basis: 'snapshot', unit: 'count', points: [
    { bucket: '<3 months', value: 0 }, { bucket: '3-6 months', value: 2 }, { bucket: '>=24 months', value: 1 },
  ] };
  const tree = renderStatic(<CountBarChart series={series} emptyText="No accepted tenancies yet" />);
  expect(renderedText(tree)).toEqual(expect.arrayContaining(['<3 months', '3 to <6 months', '24+ months', '0', '2', '1']));
  expect(renderedText(tree).some(value => value.includes('%'))).toBe(false);
  expect(renderedText(renderStatic(<CountBarChart series={{ ...series, points: series.points.map(point => ({ ...point, value: 0 })) }} emptyText="No accepted tenancies yet" />))).toContain('No accepted tenancies yet');
  expect(renderedText(renderStatic(<CountBarChart series={{ availability: 'unavailable', reason: 'No recorded history' }} />))).toContain('No recorded history');
});

it('shows the date range above the selected period and supports lifetime', async () => {
  const dataPeriod = { from: '2024-12-26T00:00:00+08:00', to: '2026-10-06T12:00:00+08:00', lifetime: true };
  expect(formatPeriodRange(dataPeriod)).toBe('Dec 26, 2024 \u2013 Oct 6, 2026');
  expect(formatPeriodRange({ from: '2026-09-01T00:00:00+08:00', to: '2026-10-01T00:00:00+08:00' })).toBe('Sep 1, 2026 \u2013 Sep 30, 2026');
  const onChange = jest.fn();
  const tree = renderStatic(<PeriodSelector value="LIFETIME" dataPeriod={dataPeriod} lifetimeLabel="Since published" onChange={onChange} />);
  expect(renderedText(tree).slice(0, 2)).toEqual(['Dec 26, 2024 \u2013 Oct 6, 2026', 'Since published']);
  const lifetime = PERIOD_OPTIONS.find(option => option.key === 'LIFETIME');
  expect(lifetime.build()).toEqual({ period: 'lifetime' });
  await AsyncStorage.setItem('token', 'test-token');
  axios.get.mockResolvedValue({ data: { period: dataPeriod } });
  const Probe = () => { useAnalytics('/api/analytics/admin/summary', 'LIFETIME'); return null; };
  await act(async () => { create(<Probe />); });
  expect(axios.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ params: { period: 'lifetime' } }));
});

it('opens the simple dropdown and closes after selecting a preset', async () => {
  const onChange = jest.fn();
  let tree;
  await act(async () => { tree = create(<PeriodSelector value="12M" onChange={onChange} />); });
  const control = () => tree.root.findAll(n => n.props.accessibilityLabel === 'Analytics period' && n.props.onPress)[0];
  expect(control().props.accessibilityState.expanded).toBe(false);
  await act(async () => control().props.onPress());
  expect(renderedText(tree)).toEqual(expect.arrayContaining(['1 month', '2 months', '3 months', '6 months', '1 year', 'Lifetime']));
  expect(renderedText(tree)).not.toContain('Custom');
  const option = tree.root.findAll(n => n.props.accessibilityLabel === '3 months' && n.props.onPress)[0];
  await act(async () => option.props.onPress());
  expect(onChange).toHaveBeenCalledWith('3M');
  expect(control().props.accessibilityState.expanded).toBe(false);
  await act(async () => control().props.onPress());
  const lifetime = tree.root.findAll(n => n.props.accessibilityLabel === 'Lifetime' && n.props.onPress)[0];
  await act(async () => lifetime.props.onPress());
  expect(onChange).toHaveBeenLastCalledWith('LIFETIME');
  expect(control().props.accessibilityState.expanded).toBe(false);
});

it('keeps calculation details off the dashboard and opens and closes them on demand', async () => {
  let tree;
  const metric = { ...available(1, 'count', 'period'), definition: 'Acceptance timestamps within the displayed period.' };
  await act(async () => { tree = create(<StatTile label="Offers accepted" metric={metric} />); });
  expect(renderedText(tree)).not.toContain('Period');
  expect(renderedText(tree)).not.toContain(metric.definition);
  const card = tree.root.findAll(node => node.props.accessibilityLabel === 'Offers accepted: 1' && node.props.onPress)[0];
  await act(async () => card.props.onPress());
  expect(renderedText(tree)).toContain(metric.definition);
  expect(renderedText(tree)).toContain('Period');
  const close = tree.root.findAll(node => node.props.accessibilityLabel === 'Close calculation details' && node.props.onPress)[0];
  await act(async () => close.props.onPress());
  expect(renderedText(tree)).not.toContain(metric.definition);
});
