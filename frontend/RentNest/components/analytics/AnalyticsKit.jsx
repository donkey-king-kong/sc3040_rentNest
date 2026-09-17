import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { FontAwesome } from 'react-native-vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL } from '../../config/api';

// Chart colors: one validated series hue; "vacant" is a neutral with a border for relief
export const COLORS = {
  ink: '#222222',
  inkSecondary: '#666666',
  inkMuted: '#888888',
  surface: '#FFFFFF',
  card: '#f9f9f9',
  border: '#EAEAEA',
  grid: '#EAEAEA',
  series: '#2a78d6',
  seriesTrack: '#dbe7f7',
  vacant: '#FFFFFF',
  vacantBorder: '#c8c7c2',
  error: '#b3261e',
};

// Decorative tile tones: icon color on a white badge (at least 4.4:1) and a light tint that keeps text above 4.5:1.
// Red is left out on purpose so ordinary tiles never read as errors.
export const TONES = {
  blue: { background: '#eaf2fc', icon: '#2a78d6' },
  green: { background: '#e6f4ec', icon: '#16794b' },
  violet: { background: '#eeecf8', icon: '#4a3aa7' },
  orange: { background: '#fdeee6', icon: '#b94a17' },
  magenta: { background: '#fbeaf1', icon: '#b83f6c' },
};

// Categorical palette in fixed order (validated): identity is never color alone, labels always accompany it
export const CATEGORY_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---------- Period ----------

const pad = (n) => String(Math.abs(n)).padStart(2, '0');

// Local midnight with the device's UTC offset, e.g. 2026-01-01T00:00:00+08:00
export const toOffsetIso = (date) => {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T00:00:00`
    + `${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`;
};

// Whole calendar months ending with the current month; 12 months always fits the 366-day limit
export const buildPeriod = (months) => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { from: toOffsetIso(from), to: toOffsetIso(to) };
};

// The last `days` days, ending at the end of today
export const buildLastDays = (days) => {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - days);
  return { from: toOffsetIso(from), to: toOffsetIso(to) };
};

export const PERIOD_OPTIONS = [
  { key: '30D', label: '30D', build: () => buildLastDays(30) },
  { key: '3M', label: '3M', build: () => buildPeriod(3) },
  { key: '6M', label: '6M', build: () => buildPeriod(6) },
  { key: '12M', label: '12M', build: () => buildPeriod(12) },
];

export const DEFAULT_PERIOD = '12M';

const periodFor = (key) => (PERIOD_OPTIONS.find((option) => option.key === key)
  || PERIOD_OPTIONS.find((option) => option.key === DEFAULT_PERIOD)).build();

// ---------- Data ----------

const describeError = (error) => {
  const status = error.response?.status;
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return "You don't have access to these analytics.";
  if (status === 404) return "This listing wasn't found.";
  if (status === 400) return error.response?.data?.message || 'The selected period is not valid.';
  if (!error.response) return "Can't reach the server. Check your connection and try again.";
  return 'Something went wrong while loading analytics.';
};

export const getAuthToken = () => AsyncStorage.getItem('token');

/**
 * Loads an analytics endpoint for a period key from PERIOD_OPTIONS (e.g. '30D', '12M').
 * Keeps the previous data visible while a new period loads.
 */
export function useAnalytics(path, periodKey) {
  const [state, setState] = useState({ loading: true, data: null, error: null, unauthenticated: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setState((previous) => ({ ...previous, loading: true, error: null }));
      try {
        const token = await getAuthToken();
        if (!token) {
          if (!cancelled) setState({ loading: false, data: null, error: null, unauthenticated: true });
          return;
        }
        const response = await axios.get(`${API_BASE_URL}${path}`, {
          params: periodFor(periodKey),
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (!cancelled) setState({ loading: false, data: response.data, error: null, unauthenticated: false });
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            data: null,
            error: describeError(error),
            unauthenticated: error.response?.status === 401,
          });
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [path, periodKey, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

// Listings the logged-in user owns (the users/{id}/listings endpoint also returns listings they rent)
export function useOwnedListings() {
  const [listings, setListings] = useState({ loading: true, items: [], error: null });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const token = await getAuthToken();
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
        const email = jwtDecode(token).sub;
        const userResponse = await axios.get(`${API_BASE_URL}/api/users/${email}`, { headers });
        const userId = userResponse.data.userID;
        const listingsResponse = await axios.get(`${API_BASE_URL}/api/users/${userId}/listings`, { headers });
        const owned = listingsResponse.data.filter((listing) => listing.ownerUserID === userId);
        if (!cancelled) setListings({ loading: false, items: owned, error: null });
      } catch (error) {
        if (!cancelled) setListings({ loading: false, items: [], error: "Couldn't load your listings." });
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return listings;
}

// ---------- Formatting ----------

const withCommas = (value) => {
  const [whole, fraction] = String(value).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction !== undefined ? `${grouped}.${fraction}` : grouped;
};

const isCurrency = (unit) => /^[A-Z]{3}$/.test(unit || '');

export const formatValue = (value, unit) => {
  if (value === null || value === undefined) return '—';
  // The backend rounds percentages and months to 1 decimal place; JSON drops trailing zeros, so restore them
  if (unit === 'percent') return `${Number(value).toFixed(1)}%`;
  if (unit === 'percentage_points') return `${Number(value).toFixed(1)} pts`;
  if (unit === 'SGD') return `S$${withCommas(value)}`;
  if (isCurrency(unit)) return `${unit} ${withCommas(value)}`;
  if (unit === 'months') return `${Number(value).toFixed(1)} mo`;
  if (unit === 'days') return `${Number(value).toFixed(1)} days`;
  if (unit === 'rating_out_of_5') return `${Number(value).toFixed(1)} / 5`;
  if (unit === 'status') return String(value).charAt(0).toUpperCase() + String(value).slice(1);
  return typeof value === 'number' ? withCommas(value) : String(value);
};

const isMonthBucket = (bucket) => /^\d{4}-\d{2}$/.test(bucket);

const shortBucket = (bucket) => (isMonthBucket(bucket) ? MONTH_NAMES[Number(bucket.slice(5, 7)) - 1] : bucket);

const fullBucket = (bucket) => (isMonthBucket(bucket)
  ? `${MONTH_NAMES[Number(bucket.slice(5, 7)) - 1]} ${bucket.slice(0, 4)}`
  : bucket.charAt(0).toUpperCase() + bucket.slice(1));

// e.g. "17 Sep 2026", in the device's time zone
export const formatDay = (iso) => {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
};

// Lifecycle metrics only cover the part of the period after tracking started, so say so
const basisLabel = (metric) => {
  if (metric.coverage && metric.coverage.complete === false) {
    return `Tracked since ${formatDay(metric.coverage.start)}`;
  }
  return metric.basis === 'period' ? 'Selected period' : 'Current';
};

export const formatChange = (metric) => {
  if (!metric || metric.availability !== 'available') return null;
  const value = Number(metric.value);
  const suffix = metric.unit === 'percentage_points' ? ' pts' : '%';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}${suffix} vs previous period`;
};

// ---------- Layout ----------

export const Section = ({ title, note, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {note ? <Text style={styles.sectionNote}>{note}</Text> : null}
    {children}
  </View>
);

export const TileRow = ({ children }) => <View style={styles.tileRow}>{children}</View>;

export const PeriodSelector = ({ value, onChange, loading }) => (
  <View style={styles.periodRow}>
    <Text style={styles.periodLabel}>Period</Text>
    {PERIOD_OPTIONS.map((option) => {
      const selected = option.key === value;
      return (
        <Pressable
          key={option.key}
          onPress={() => onChange(option.key)}
          style={[styles.chip, selected && styles.chipSelected]}
          accessibilityRole="button"
          accessibilityState={{ selected }}
        >
          <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
        </Pressable>
      );
    })}
    {loading ? <ActivityIndicator size="small" color={COLORS.inkMuted} style={styles.periodSpinner} /> : null}
  </View>
);

export const LoadingState = () => (
  <View style={styles.centerState}>
    <ActivityIndicator size="large" color={COLORS.ink} />
    <Text style={styles.stateText}>Loading analytics…</Text>
  </View>
);

export const ErrorState = ({ message, onRetry, actionLabel = 'Try again' }) => (
  <View style={styles.centerState}>
    <Text style={styles.errorText}>{message}</Text>
    {onRetry ? (
      <Pressable style={styles.retryButton} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.retryText}>{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

// ---------- Stat tile ----------

/**
 * A single metric. Tap to show how it is calculated. Unavailable metrics show "Not available", never 0.
 * `change` is an optional percent-change metric, shown underneath only when it could be calculated.
 * `icon` (a FontAwesome name) and `tone` (a TONES key) are decoration only; the label carries the meaning.
 */
export const StatTile = ({ label, metric, change, icon, tone }) => {
  const [showDefinition, setShowDefinition] = useState(false);
  if (!metric) return null;
  const available = metric.availability === 'available';
  const colors = TONES[tone];

  return (
    <Pressable
      style={[styles.tile, colors && { backgroundColor: colors.background, borderColor: colors.background }]}
      onPress={() => setShowDefinition((shown) => !shown)}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${available ? formatValue(metric.value, metric.unit) : 'not available'}`}
      accessibilityHint="Shows how this metric is calculated"
    >
      <View style={styles.tileHeader}>
        {icon ? (
          <View style={styles.tileIcon} importantForAccessibility="no" accessibilityElementsHidden>
            <FontAwesome name={icon} size={14} color={colors ? colors.icon : COLORS.inkSecondary} />
          </View>
        ) : null}
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
      {available ? (
        <Text style={styles.tileValue}>{formatValue(metric.value, metric.unit)}</Text>
      ) : (
        <Text style={styles.tileUnavailable}>Not available</Text>
      )}
      {available && formatChange(change) ? <Text style={styles.tileChange}>{formatChange(change)}</Text> : null}
      <Text style={styles.tileBasis}>{basisLabel(metric)}</Text>
      {!available && metric.reason ? <Text style={styles.tileReason}>{metric.reason}</Text> : null}
      {showDefinition ? <Text style={styles.tileDefinition}>{metric.definition}</Text> : null}
    </Pressable>
  );
};

// ---------- Meter ----------

/** A percentage against 100%, on a track from the same hue. */
export const Meter = ({ label, metric }) => {
  const [showDefinition, setShowDefinition] = useState(false);
  if (!metric) return null;
  const available = metric.availability === 'available';
  const percent = available ? Math.max(0, Math.min(100, Number(metric.value))) : 0;

  return (
    <Pressable
      style={styles.meter}
      onPress={() => setShowDefinition((shown) => !shown)}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${available ? `${metric.value} percent` : 'not available'}`}
    >
      <View style={styles.meterHeader}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text style={available ? styles.meterValue : styles.tileUnavailable}>
          {available ? formatValue(metric.value, metric.unit) : 'Not available'}
        </Text>
      </View>
      <View style={[styles.meterTrack, !available && styles.meterTrackUnavailable]}>
        {available ? <View style={[styles.meterFill, { width: `${percent}%` }]} /> : null}
      </View>
      {!available && metric.reason ? <Text style={styles.tileReason}>{metric.reason}</Text> : null}
      {showDefinition ? <Text style={styles.tileDefinition}>{metric.definition}</Text> : null}
    </Pressable>
  );
};

// ---------- Shared chart pieces ----------

const showLabel = (index, count) => count <= 6 || index % 2 === 0;

const TableView = ({ points, unit }) => (
  <View style={styles.table}>
    {points.map((point) => (
      <View key={point.bucket} style={styles.tableRow}>
        <Text style={styles.tableCell}>{fullBucket(point.bucket)}</Text>
        <Text style={[styles.tableCell, styles.tableValue]}>{formatValue(point.value, unit)}</Text>
      </View>
    ))}
  </View>
);

const TableToggle = ({ shown, onPress }) => (
  <Pressable onPress={onPress} accessibilityRole="button" style={styles.tableToggle}>
    <Text style={styles.tableToggleText}>{shown ? 'Hide table' : 'View as table'}</Text>
  </Pressable>
);

const SeriesUnavailable = ({ series }) => (
  <View style={styles.chartCard}>
    <Text style={styles.tileUnavailable}>Not available</Text>
    {series?.reason ? <Text style={styles.tileReason}>{series.reason}</Text> : null}
  </View>
);

// ---------- Bar chart ----------

const PLOT_HEIGHT = 140;

/** Single-series bar chart. Tap a bar to read its value. `maxValue` fixes the scale, e.g. 100 for percentages. */
export const BarChart = ({ series, emptyText, maxValue }) => {
  const [selected, setSelected] = useState(null);
  const [showTable, setShowTable] = useState(false);

  if (!series || series.availability !== 'available') return <SeriesUnavailable series={series} />;

  const points = series.points || [];
  const dataMax = Math.max(0, ...points.map((point) => Number(point.value) || 0));
  const max = maxValue ?? dataMax;
  const selectedPoint = selected !== null ? points[selected] : null;

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartReadout}>
        {selectedPoint
          ? `${fullBucket(selectedPoint.bucket)}: ${formatValue(selectedPoint.value, series.unit)}`
          : dataMax === 0 ? emptyText : 'Tap a bar to see its value'}
      </Text>

      <View style={styles.plotRow}>
        <View style={[styles.yAxis, { height: PLOT_HEIGHT }]}>
          <Text style={styles.axisText}>{formatValue(max, series.unit)}</Text>
          <Text style={styles.axisText}>{formatValue(0, series.unit)}</Text>
        </View>
        <View style={[styles.plot, { height: PLOT_HEIGHT }]}>
          <View style={[styles.gridLine, { top: 0 }]} />
          <View style={styles.columns}>
            {points.map((point, index) => {
              const value = Number(point.value) || 0;
              const heightPercent = max === 0 ? 0 : (value / max) * 100;
              const dimmed = selected !== null && selected !== index;
              return (
                <Pressable
                  key={point.bucket}
                  style={styles.column}
                  onPress={() => setSelected(selected === index ? null : index)}
                  accessibilityRole="button"
                  accessibilityLabel={`${fullBucket(point.bucket)}: ${formatValue(point.value, series.unit)}`}
                >
                  {value > 0 ? (
                    <View style={[styles.bar, { height: `${heightPercent}%`, opacity: dimmed ? 0.4 : 1 }]} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.baseline} />
        </View>
      </View>

      <View style={styles.xLabels}>
        {points.map((point, index) => (
          <Text key={point.bucket} style={styles.xLabel} numberOfLines={1}>
            {showLabel(index, points.length) ? shortBucket(point.bucket) : ''}
          </Text>
        ))}
      </View>

      <TableToggle shown={showTable} onPress={() => setShowTable((shown) => !shown)} />
      {showTable ? <TableView points={points} unit={series.unit} /> : null}
    </View>
  );
};

// ---------- Line chart ----------

const LINE_HEIGHT = 150;
const LINE_INSET = 8; // keeps the end markers inside the plot

/** Single-series line chart for trends. Tap a point to read it. `maxValue` fixes the scale, e.g. 100 for percentages. */
export const LineChart = ({ series, emptyText, maxValue }) => {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showTable, setShowTable] = useState(false);

  if (!series || series.availability !== 'available') return <SeriesUnavailable series={series} />;

  const points = series.points || [];
  const values = points.map((point) => Number(point.value) || 0);
  const dataMax = Math.max(0, ...values);
  const max = maxValue ?? (dataMax || 1);
  const count = points.length;
  const spacing = count > 1 ? (width - LINE_INSET * 2) / (count - 1) : width;
  const xFor = (index) => (count > 1 ? LINE_INSET + index * spacing : width / 2);
  const yFor = (value) => LINE_HEIGHT - LINE_INSET - (value / max) * (LINE_HEIGHT - LINE_INSET * 2);
  const coords = values.map((value, index) => [xFor(index), yFor(value)]);
  const baseline = LINE_HEIGHT - LINE_INSET;
  const linePath = coords.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const areaPath = count > 1 ? `${linePath} L${coords[count - 1][0]},${baseline} L${coords[0][0]},${baseline} Z` : '';
  const selectedPoint = selected !== null ? points[selected] : null;

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartReadout}>
        {selectedPoint
          ? `${fullBucket(selectedPoint.bucket)}: ${formatValue(selectedPoint.value, series.unit)}`
          : dataMax === 0 ? emptyText : 'Tap a point to see its value'}
      </Text>

      <View style={styles.plotRow}>
        <View style={[styles.yAxis, { height: LINE_HEIGHT }]}>
          <Text style={styles.axisText}>{formatValue(max, series.unit)}</Text>
          <Text style={styles.axisText}>{formatValue(0, series.unit)}</Text>
        </View>
        <View style={[styles.plot, { height: LINE_HEIGHT }]} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
          {width > 0 ? (
            <Svg width={width} height={LINE_HEIGHT}>
              <Line x1={0} x2={width} y1={LINE_INSET} y2={LINE_INSET} stroke={COLORS.grid} strokeWidth={1} />
              <Line x1={0} x2={width} y1={LINE_HEIGHT / 2} y2={LINE_HEIGHT / 2} stroke={COLORS.grid} strokeWidth={1} />
              <Line x1={0} x2={width} y1={baseline} y2={baseline} stroke={COLORS.inkMuted} strokeWidth={1} />
              {areaPath ? <Path d={areaPath} fill={COLORS.series} fillOpacity={0.12} /> : null}
              {selected !== null ? (
                <Line x1={coords[selected][0]} x2={coords[selected][0]} y1={LINE_INSET} y2={baseline}
                  stroke={COLORS.inkMuted} strokeWidth={1} strokeDasharray="3,3" />
              ) : null}
              {count > 1 ? (
                <Path d={linePath} stroke={COLORS.series} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              ) : null}
              {coords.map(([x, y], index) => (
                <Circle key={points[index].bucket} cx={x} cy={y} r={selected === index ? 6 : 4}
                  fill={COLORS.series} stroke={COLORS.card} strokeWidth={2} />
              ))}
            </Svg>
          ) : null}
          {/* Hit targets are wider than the markers: one column per point */}
          {points.map((point, index) => (
            <Pressable
              key={point.bucket}
              style={[styles.lineHit, { left: xFor(index) - spacing / 2, width: Math.max(spacing, 24) }]}
              onPress={() => setSelected(selected === index ? null : index)}
              accessibilityRole="button"
              accessibilityLabel={`${fullBucket(point.bucket)}: ${formatValue(point.value, series.unit)}`}
            />
          ))}
        </View>
      </View>

      <View style={[styles.xLabels, styles.lineLabels]}>
        {width > 0 ? points.map((point, index) => (
          <Text key={point.bucket} numberOfLines={1}
            style={[styles.xLabel, styles.lineLabel, { left: xFor(index) - spacing / 2, width: Math.max(spacing, 24) }]}>
            {showLabel(index, points.length) ? shortBucket(point.bucket) : ''}
          </Text>
        )) : null}
      </View>

      <TableToggle shown={showTable} onPress={() => setShowTable((shown) => !shown)} />
      {showTable ? <TableView points={points} unit={series.unit} /> : null}
    </View>
  );
};

// ---------- Share bar ----------

/** Parts of a whole as one segmented bar, with a labelled legend so identity never relies on color alone. */
export const ShareBar = ({ series, emptyText }) => {
  const [showTable, setShowTable] = useState(false);

  if (!series || series.availability !== 'available') return <SeriesUnavailable series={series} />;

  const points = series.points || [];
  const total = points.reduce((sum, point) => sum + (Number(point.value) || 0), 0);
  const share = (value) => (total === 0 ? '0.0' : ((Number(value) / total) * 100).toFixed(1));

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartReadout}>{total === 0 ? emptyText : `${withCommas(total)} in total`}</Text>

      {total > 0 ? (
        <View style={styles.shareBar} accessibilityLabel={points.map((point) => `${point.bucket}: ${point.value}`).join(', ')}>
          {points.map((point, index) => (Number(point.value) > 0 ? (
            <View
              key={point.bucket}
              style={[styles.shareSegment, { flex: Number(point.value), backgroundColor: CATEGORY_COLORS[index] }]}
            />
          ) : null))}
        </View>
      ) : null}

      <View style={styles.shareLegend}>
        {points.map((point, index) => (
          <View key={point.bucket} style={styles.shareLegendRow}>
            <View style={[styles.legendSwatch, { backgroundColor: CATEGORY_COLORS[index] }]} />
            <Text style={styles.shareLegendLabel}>{point.bucket}</Text>
            <Text style={styles.shareLegendValue}>{`${withCommas(point.value)} · ${share(point.value)}%`}</Text>
          </View>
        ))}
      </View>

      <TableToggle shown={showTable} onPress={() => setShowTable((shown) => !shown)} />
      {showTable ? <TableView points={points} unit={series.unit} /> : null}
    </View>
  );
};

// ---------- Occupancy strip ----------

/** One cell per month: filled = occupied, outlined = vacant. Tap a cell to read it. */
export const OccupancyStrip = ({ series }) => {
  const [selected, setSelected] = useState(null);
  const [showTable, setShowTable] = useState(false);

  if (!series || series.availability !== 'available') return <SeriesUnavailable series={series} />;

  const points = series.points || [];
  const occupiedMonths = points.filter((point) => point.value === 'occupied').length;
  const selectedPoint = selected !== null ? points[selected] : null;

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartReadout}>
        {selectedPoint
          ? `${fullBucket(selectedPoint.bucket)}: ${formatValue(selectedPoint.value, 'status')}`
          : `Occupied ${occupiedMonths} of ${points.length} months`}
      </Text>

      <View style={styles.stripRow}>
        {points.map((point, index) => {
          const occupied = point.value === 'occupied';
          return (
            <Pressable
              key={point.bucket}
              style={styles.stripHit}
              onPress={() => setSelected(selected === index ? null : index)}
              accessibilityRole="button"
              accessibilityLabel={`${fullBucket(point.bucket)}: ${point.value}`}
            >
              <View
                style={[
                  styles.stripCell,
                  occupied ? styles.stripOccupied : styles.stripVacant,
                  selected === index && styles.stripSelected,
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.xLabels, styles.stripLabels]}>
        {points.map((point, index) => (
          <Text key={point.bucket} style={styles.xLabel} numberOfLines={1}>
            {showLabel(index, points.length) ? shortBucket(point.bucket) : ''}
          </Text>
        ))}
      </View>

      <View style={styles.legend}>
        <View style={[styles.legendSwatch, styles.stripOccupied]} />
        <Text style={styles.legendText}>Occupied</Text>
        <View style={[styles.legendSwatch, styles.stripVacant]} />
        <Text style={styles.legendText}>Vacant</Text>
      </View>

      <TableToggle shown={showTable} onPress={() => setShowTable((shown) => !shown)} />
      {showTable ? <TableView points={points} unit="status" /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.ink,
    marginBottom: 4,
  },
  sectionNote: {
    fontSize: 13,
    color: COLORS.inkSecondary,
    marginBottom: 10,
  },
  tileRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginTop: 6,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    margin: 5,
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tileLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.inkSecondary,
  },
  tileValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.ink,
    marginTop: 4,
  },
  tileUnavailable: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.inkMuted,
    marginTop: 4,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tileIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  tileBasis: {
    fontSize: 11,
    color: COLORS.inkSecondary,
    marginTop: 4,
  },
  tileChange: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink,
    marginTop: 2,
  },
  tileReason: {
    fontSize: 12,
    color: COLORS.inkSecondary,
    marginTop: 6,
  },
  tileDefinition: {
    fontSize: 12,
    color: COLORS.inkSecondary,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  meter: {
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 10,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  meterLabel: {
    fontSize: 14,
    color: COLORS.ink,
  },
  meterValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.ink,
  },
  meterTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.seriesTrack,
    overflow: 'hidden',
  },
  meterTrackUnavailable: {
    backgroundColor: COLORS.border,
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: COLORS.series,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  periodLabel: {
    fontSize: 14,
    color: COLORS.inkSecondary,
    marginRight: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    backgroundColor: COLORS.surface,
  },
  chipSelected: {
    backgroundColor: COLORS.ink,
    borderColor: COLORS.ink,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.ink,
  },
  chipTextSelected: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  periodSpinner: {
    marginLeft: 4,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  stateText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.inkSecondary,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 14,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: COLORS.ink,
  },
  retryText: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  chartCard: {
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 6,
  },
  chartReadout: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
    marginBottom: 10,
  },
  plotRow: {
    flexDirection: 'row',
  },
  yAxis: {
    justifyContent: 'space-between',
    marginRight: 6,
    minWidth: 44,
  },
  axisText: {
    fontSize: 10,
    color: COLORS.inkMuted,
    textAlign: 'right',
  },
  plot: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.grid,
  },
  columns: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  column: {
    flex: 1,
    justifyContent: 'flex-end',
    marginHorizontal: 1,
  },
  bar: {
    backgroundColor: COLORS.series,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  baseline: {
    height: 1,
    backgroundColor: COLORS.inkMuted,
  },
  xLabels: {
    flexDirection: 'row',
    marginLeft: 50,
    marginTop: 4,
  },
  xLabel: {
    flex: 1,
    fontSize: 10,
    color: COLORS.inkMuted,
    textAlign: 'center',
  },
  stripRow: {
    flexDirection: 'row',
  },
  stripLabels: {
    marginLeft: 0,
  },
  stripHit: {
    flex: 1,
    paddingHorizontal: 1,
    paddingVertical: 4,
  },
  stripCell: {
    height: 28,
    borderRadius: 4,
  },
  stripOccupied: {
    backgroundColor: COLORS.series,
  },
  stripVacant: {
    backgroundColor: COLORS.vacant,
    borderWidth: 1,
    borderColor: COLORS.vacantBorder,
  },
  stripSelected: {
    borderWidth: 2,
    borderColor: COLORS.ink,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 6,
  },
  lineHit: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  lineLabels: {
    height: 16,
    position: 'relative',
  },
  lineLabel: {
    position: 'absolute',
    flex: undefined,
  },
  shareBar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  shareSegment: {
    height: '100%',
    marginRight: 2,
  },
  shareLegend: {
    marginTop: 12,
  },
  shareLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  shareLegendLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.ink,
  },
  shareLegendValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.inkSecondary,
    marginRight: 16,
  },
  tableToggle: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  tableToggleText: {
    fontSize: 13,
    color: COLORS.ink,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  table: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableCell: {
    fontSize: 13,
    color: COLORS.ink,
  },
  tableValue: {
    fontWeight: '600',
  },
});
