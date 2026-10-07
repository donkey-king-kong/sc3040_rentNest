import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, ActivityIndicator, Modal, ScrollView, Platform } from 'react-native';
import { FontAwesome } from 'react-native-vector-icons';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL } from '../../config/api';
import MorphingInfinity from '../MorphingInfinity';

// Chart colors: one validated series hue; "vacant" is a neutral with a border for relief
export const COLORS = {
  ink: '#222222',
  inkSecondary: '#666666',
  inkMuted: '#888888',
  surface: '#FFFFFF',
  card: '#f9f9f9',
  border: '#EAEAEA',
  grid: '#EAEAEA',
  series: '#111111',
  seriesTrack: '#EEEEEE',
  vacant: '#FFFFFF',
  vacantBorder: '#c8c7c2',
  error: '#b3261e',
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

// Singapore calendar dates, independent of the phone's time zone.
const singaporeDate = now => new Date(now.getTime() + 8 * 60 * 60 * 1000);
const singaporeMidnight = date => date.toISOString().slice(0, 10) + 'T00:00:00+08:00';
const singaporeInstant = now => singaporeDate(now).toISOString().replace('Z', '+08:00');

// Completed calendar months; the current partial month is excluded.
export const buildPeriod = (months, now = new Date()) => {
  const today = singaporeDate(now);
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  return { from: singaporeMidnight(new Date(Date.UTC(year, month - months, 1))), to: singaporeMidnight(new Date(Date.UTC(year, month, 1))) };
};
export const buildLastDays = (days, now = new Date()) => {
  const today = singaporeDate(now);
  const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - days + 1));
  return { from: singaporeMidnight(from), to: singaporeInstant(now) };
};
export const buildPastYear = (now = new Date()) => {
  const today = singaporeDate(now);
  return {
    from: singaporeMidnight(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1))),
    to: singaporeInstant(now),
  };
};
export const PERIOD_OPTIONS = [
  { key: '1M', label: '1 month', build: () => buildPeriod(1) },
  { key: '2M', label: '2 months', build: () => buildPeriod(2) },
  { key: '3M', label: '3 months', build: () => buildPeriod(3) },
  { key: '6M', label: '6 months', build: () => buildPeriod(6) },
  { key: '12M', label: '1 year', build: () => buildPastYear() },
  { key: 'LIFETIME', label: 'Lifetime', build: () => ({ period: 'lifetime' }) },
];
export const DEFAULT_PERIOD = 'LIFETIME';
export const resolvePeriodKey = key => PERIOD_OPTIONS.some(option => option.key === key) ? key : DEFAULT_PERIOD;
const periodFor = key => PERIOD_OPTIONS.find(option => option.key === resolvePeriodKey(key)).build();

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
 * Loads an analytics endpoint for a period key from PERIOD_OPTIONS (e.g. '1M', '12M').
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
export function useOwnedListings(refreshKey = 0) {
  const [listings, setListings] = useState({ loading: true, items: [], error: null });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setListings(previous => ({ ...previous, loading: true, error: null }));
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
  }, [refreshKey]);

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


export const formatChange = (metric) => {
  if (!metric || metric.availability !== 'available') return null;
  const value = Number(metric.value);
  const suffix = metric.unit === 'percentage_points' ? ' pts' : '%';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}${suffix} vs previous period`;
};

// ---------- Layout ----------

export const Section = ({ title, note, action, children }) => (
  <View style={styles.section}>
    {action ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
      <Text style={[styles.sectionTitle, { flexShrink: 1, marginBottom: 0 }]}>{title}</Text>
      {action}
    </View> : title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
    {note ? <Text style={styles.sectionNote}>{note}</Text> : null}
    {children}
  </View>
);

export const TileRow = ({ children }) => <View style={styles.tileRow}>{children}</View>;

export const formatPeriodRange = period => {
  if (!period?.from || !period?.to) return null;
  const format = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: period.timeZone || 'Asia/Singapore' });
  return `${format.format(new Date(period.from))} \u2013 ${format.format(new Date(new Date(period.to).getTime() - 1))}`;
};

export const PeriodSelector = ({ value, onChange, loading, accentColor, trailingAction, dataPeriod, lifetimeLabel = 'Lifetime' }) => {
  const [open, setOpen] = useState(false);
  const selected = resolvePeriodKey(value);
  const optionLabel = option => option.key === 'LIFETIME' ? lifetimeLabel : option.label;
  const label = optionLabel(PERIOD_OPTIONS.find(option => option.key === selected));
  const dates = selected === 'LIFETIME'
    ? (!loading && dataPeriod?.lifetime ? formatPeriodRange(dataPeriod) : 'All recorded history')
    : formatPeriodRange(periodFor(selected));
  const color = accentColor || '#16794B';
  const toggle = () => setOpen(shown => !shown);
  return <View style={styles.periodContainer}>
    <View style={styles.periodControlRow}>
      <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel="Analytics period" accessibilityState={{ expanded: open }} style={styles.periodTrigger}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.periodCaption}>{dates}</Text>
          <Text style={styles.periodSelectedLabel}>{label}</Text>
        </View>
        {loading ? <ActivityIndicator size="small" color={color} accessibilityLabel="Updating analytics" /> : <FontAwesome name={open ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.inkSecondary} />}
      </Pressable>
      {trailingAction}
    </View>
    {open ? <View style={styles.periodMenu}>
      {PERIOD_OPTIONS.map(option => <Pressable key={option.key} onPress={() => { if (selected !== option.key) onChange(option.key); setOpen(false); }} accessibilityRole="button" accessibilityLabel={optionLabel(option)} accessibilityState={{ selected: selected === option.key }} style={[styles.periodOption, selected === option.key && styles.periodOptionSelected]}>
        <Text style={[styles.periodOptionTitle, { flex: 1 }]}>{optionLabel(option)}</Text>
        {selected === option.key ? <FontAwesome name="check" size={16} color={color} /> : null}
      </Pressable>)}
    </View> : null}
  </View>;
};

export const LoadingState = ({ message = "Loading analytics…", textStyle } = {}) => (
  <View style={styles.centerState}>
    <MorphingInfinity size={86} color="#2FA84F" />
    <Text style={[styles.stateText, textStyle]}>{message}</Text>
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
 * `featured` gives the main overview figures more visual emphasis.
 */
const scopeFor = (metric, scope) => scope === 'Now' ? null : scope || (metric?.basis === 'period' ? 'Period' : null);
const visibleScopeFor = (metric, scope) => {
  const label = scopeFor(metric, scope);
  return ['Now', 'All time', 'Period'].includes(label) ? null : label;
};
export const MetricDetails = ({ label, metric, scope, visible, onClose, hideValue = false }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.detailsBackdrop}>
      <View style={styles.detailsPanel} accessibilityViewIsModal>
        <View style={styles.detailsHeader}>
          <Text accessibilityRole="header" style={styles.detailsTitle}>{label}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close calculation details" onPress={onClose} style={styles.detailsClose}><FontAwesome name="times" size={20} color={COLORS.ink} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {scopeFor(metric, scope) ? <Text style={styles.scope}>{scopeFor(metric, scope)}</Text> : null}
          {!hideValue ? <Text style={styles.detailsValue}>{metric?.availability === 'available' ? formatValue(metric.value, metric.unit) : 'Not available'}</Text> : null}
          <Text style={styles.detailsBody}>{metric?.definition || 'Calculation details are not recorded.'}</Text>
          {metric?.reason ? <Text style={styles.detailsBody}>{metric.reason}</Text> : null}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

export const StatTile = ({ label, metric, change, featured = false, scope, supportingText, unavailableText = 'Not available', children }) => {
  const [showDefinition, setShowDefinition] = useState(false);
  const { width } = useWindowDimensions();
  if (!metric) return null;
  const available = metric.availability === 'available';

  return (
    <Pressable
      style={[styles.tile, width >= 1000 && styles.wideTile, featured && styles.featuredTile]}
      onPress={() => setShowDefinition((shown) => !shown)}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${available ? formatValue(metric.value, metric.unit) : unavailableText}${supportingText ? '. ' + supportingText : ''}`}
      accessibilityHint="Shows how this metric is calculated"
      accessibilityState={{ expanded: showDefinition }}
    >
      <View style={styles.tileHeader}>
        <Text style={styles.tileLabel}>{label}</Text><FontAwesome name="info-circle" size={16} color={COLORS.inkSecondary} />
      </View>
      {visibleScopeFor(metric, scope) ? <Text style={styles.scope}>{visibleScopeFor(metric, scope)}</Text> : null}
      {available ? (
        <Text style={[styles.tileValue, featured && styles.featuredValue]}>{formatValue(metric.value, metric.unit)}</Text>
      ) : (
        <Text style={styles.tileUnavailable}>{unavailableText}</Text>
      )}
      {children}
      {supportingText ? <Text style={styles.tileChange}>{supportingText}</Text> : null}
      {available && formatChange(change) ? <Text style={styles.tileChange}>{formatChange(change)}</Text> : null}
      {showDefinition ? <MetricDetails label={label} metric={metric} scope={scope} visible onClose={() => setShowDefinition(false)} /> : null}
    </Pressable>
  );
};

// ---------- Meter ----------

/** A percentage against 100%, on a track from the same hue. */
export const Meter = ({ label, metric, scope }) => {
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
        <Text style={styles.meterLabel}>{label}</Text><FontAwesome name="info-circle" size={16} color={COLORS.inkSecondary} />
        <Text style={available ? styles.meterValue : styles.tileUnavailable}>
          {available ? formatValue(metric.value, metric.unit) : 'Not available'}
        </Text>
      </View>
      {visibleScopeFor(metric, scope) ? <Text style={styles.scope}>{visibleScopeFor(metric, scope)}</Text> : null}
      <View style={[styles.meterTrack, !available && styles.meterTrackUnavailable]}>
        {available ? <View style={[styles.meterFill, { width: `${percent}%` }]} /> : null}
      </View>
      {showDefinition ? <MetricDetails label={label} metric={metric} scope={scope || 'Now'} visible onClose={() => setShowDefinition(false)} /> : null}
    </Pressable>
  );
};

// ---------- Shared chart pieces ----------

const showLabel = (index, count) => count <= 6 || index % 2 === 0;
const showTrendLabel = (index, points, everyMonth) => everyMonth || showLabel(index, points.length);

const ChartReadout = ({ series, children, hidePeriodLabel = false, title, compact = false }) => {
  const [visible, setVisible] = useState(false);
  const scope = series.basis === 'period' ? 'Period' : 'All time';
  return <>
    <View style={[styles.chartHeading, title && { alignItems: 'flex-start' }, compact && { marginBottom: 4 }]}>
      <View style={{ flex: 1 }}>
        {title ? <Text accessibilityRole="header" style={[styles.sectionTitle, { marginBottom: 0 }]}>{title}</Text> : null}
        {children ? <Text style={styles.chartReadout}>{children}</Text> : null}
        {!hidePeriodLabel && scope === 'Period' ? <Text style={styles.scope}>{scope}</Text> : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Chart calculation details" onPress={() => setVisible(true)} hitSlop={12} style={styles.chartInfoButton}>
        <FontAwesome name="info-circle" size={18} color={COLORS.inkSecondary} />
      </Pressable>
    </View>
    {visible ? <MetricDetails label={title || 'About this chart'} metric={series} hideValue visible onClose={() => setVisible(false)} /> : null}
  </>;
};

const SeriesUnavailable = ({ series, title }) => (
  <View style={styles.chartCard}>
    {title ? <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text> : null}
    <Text style={styles.tileUnavailable}>Not available</Text>
    {series?.reason ? <Text style={styles.tileReason}>{series.reason}</Text> : null}
  </View>
);

// ---------- Bar chart ----------

export const chartMaximum = value => {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  return (scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10) * magnitude;
};
const ticks = max => [max, max * 0.75, max * 0.5, max * 0.25, 0];
const ChartAxis = ({ max, unit, height, inset = 0, tickValues = ticks(max) }) => <View style={[styles.yAxis, { height, paddingVertical: inset }]}>{tickValues.map(value => <Text key={value} style={styles.axisText}>{formatValue(Number(value.toFixed(2)), unit)}</Text>)}</View>;
const PLOT_HEIGHT = 140;

const PointTooltip = ({ text, x, y, plotWidth, plotHeight }) => {
  const [height, setHeight] = useState(48);
  const lines = text.replace(': ', '\n').split('; ').join('\n');
  const longestLine = Math.max(...lines.split('\n').map(line => line.length));
  const width = Math.min(Math.max(120, longestLine * 7 + 20), 230, plotWidth || 230);
  const left = Math.max(0, Math.min(x - width / 2, Math.max(0, plotWidth - width)));
  const above = y - height - 8;
  const top = above >= 0 ? above : Math.max(0, Math.min(y + 10, plotHeight - height));
  return <View pointerEvents="none" accessibilityLiveRegion="polite" accessibilityLabel={text}
    onLayout={event => setHeight(event.nativeEvent.layout.height)}
    style={[styles.pointTooltip, { width, left, top }]}>
    <Text style={styles.pointTooltipText}>{lines}</Text>
  </View>;
};

/** Single-series bar chart. Tap a bar to read its value. `maxValue` fixes the scale, e.g. 100 for percentages. */
export const BarChart = ({ series, emptyText, maxValue, title, cleanHeader = false, hidePeriodLabel = true, showEveryMonth = false }) => {
  const [selected, setSelected] = useState(null);
  const [width, setWidth] = useState(0);
  useEffect(() => setSelected(null), [series]);

  if (!series || series.availability !== 'available') return <SeriesUnavailable series={series} title={title} />;

  const points = series.points || [];
  const dataMax = Math.max(0, ...points.map((point) => Number(point.value) || 0));
  const max = maxValue ?? chartMaximum(dataMax);
  const selectedPoint = selected !== null ? points[selected] : null;

  return (
    <View style={styles.chartCard}>
      <ChartReadout series={series} title={title} hidePeriodLabel={hidePeriodLabel}>
        {points.every(point => point.value == null) || (dataMax === 0 && series.unit !== 'days') ? emptyText : null}
      </ChartReadout>

      <View style={styles.plotRow}>
        <ChartAxis max={max} unit={cleanHeader ? undefined : series.unit} height={PLOT_HEIGHT} />
        <View style={[styles.plot, { height: PLOT_HEIGHT }]} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
          {[0, 25, 50, 75].map(top => <View key={top} style={[styles.gridLine, { top: top + '%' }]} />)}
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
          {selectedPoint ? <PointTooltip
            text={`${fullBucket(selectedPoint.bucket)}: ${formatValue(selectedPoint.value, series.unit)}`}
            x={(selected + 0.5) * width / points.length}
            y={PLOT_HEIGHT * (1 - (Number(selectedPoint.value) || 0) / max)} plotWidth={width} plotHeight={PLOT_HEIGHT} /> : null}
        </View>
      </View>

      <View style={styles.xLabels}>
        {points.map((point, index) => (
          <Text key={point.bucket} style={styles.xLabel} numberOfLines={1}>
            {showTrendLabel(index, points, showEveryMonth) ? shortBucket(point.bucket) : ''}
          </Text>
        ))}
      </View>

    </View>
  );
};

// ---------- Line chart ----------

export const CountBarChart = ({ series, emptyText, countLabel = 'Tenancies', valueLabel = 'tenancies', totalMetric, totalLabel = 'Total', showReadout = true, title, scaleToTotal = false }) => {
  if (!series || series.availability !== 'available') return <SeriesUnavailable series={series} title={title} />;
  const points = series.points || [];
  if (points.some(point => point.availability !== 'unavailable' && (point.value === null || !Number.isInteger(Number(point.value)) || Number(point.value) < 0))) {
    return <SeriesUnavailable series={{ reason: 'Counts are not valid.' }} title={title} />;
  }
  const max = Math.max(0, ...points.filter(point => point.availability !== 'unavailable').map(point => Number(point.value)));
  const validTotal = totalMetric?.availability === 'available' && totalMetric.value !== null
    && Number.isFinite(Number(totalMetric.value)) && Number(totalMetric.value) >= max;
  const scale = scaleToTotal && validTotal ? Number(totalMetric.value) : max;
  const valueText = point => {
    if (point.availability === 'unavailable') return 'Not available';
    const count = formatValue(point.value, 'count');
    return scaleToTotal && validTotal && scale > 0
      ? `${count} (${(Number(point.value) / scale * 100).toFixed(1)}%)` : count;
  };
  const labelFor = label => ({ '3-6 months': '3 to <6 months', '6-12 months': '6 to <12 months', '12-24 months': '12 to <24 months', '>=24 months': '24+ months' }[label] || label);
  return <View style={styles.chartCard}>
    {title ? <ChartReadout title={title} series={series} hidePeriodLabel compact /> : null}
    {totalMetric ? <View style={{ marginBottom: 20 }}><MetricRow label={totalLabel} metric={totalMetric} showInfo={!title} /></View> : null}
    {showReadout ? <ChartReadout series={series}>{max === 0 ? emptyText : countLabel}</ChartReadout> : null}
    {points.map(point => <View key={point.bucket} style={styles.countBarRow} accessible accessibilityLabel={`${labelFor(point.bucket)}: ${valueText(point)}${valueLabel && point.availability !== 'unavailable' ? ' ' + valueLabel : ''}`}>
      <View style={styles.countBarHeading}>
        <Text style={styles.countBarLabel}>{labelFor(point.bucket)}</Text>
        <Text style={styles.countBarValue}>{valueText(point)}</Text>
      </View>
      <View style={styles.countBarTrack}>
        <View style={[styles.countBarFill, { width: `${scale === 0 || point.availability === 'unavailable' ? 0 : Number(point.value) / scale * 100}%` }]} />
      </View>
    </View>)}
  </View>;
};

const LINE_HEIGHT = 150;
const LINE_INSET = 8; // keeps the end markers inside the plot

/** Single-series line chart for trends. Tap a point to read it. `maxValue` fixes the scale, e.g. 100 for percentages. */
export const LineChart = ({ series, emptyText, maxValue, title, seriesLabel, comparisonSeries, comparisonLabel, hidePeriodLabel = true, cleanHeader = false, showEveryMonth = false }) => {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState(null);
  useEffect(() => setSelected(null), [series, comparisonSeries]);

  if (!series || series.availability !== 'available') return <SeriesUnavailable series={series} title={title} />;

  const points = series.points || [];
  const values = points.map((point) => point.value == null ? null : Number(point.value));
  const comparison = comparisonSeries?.availability === 'available' ? comparisonSeries : null;
  const comparisonValues = points.map(point => {
    const value = comparison?.points?.find(other => other.bucket === point.bucket)?.value;
    return value == null ? null : Number(value);
  });
  const dataMax = Math.max(0, ...values.filter(Number.isFinite), ...comparisonValues.filter(Number.isFinite));
  const rawMax = maxValue ?? chartMaximum(dataMax);
  const max = series.unit === 'count' ? (rawMax <= 4 ? Math.max(1, Math.ceil(rawMax)) : Math.ceil(rawMax / 4) * 4) : rawMax;
  const axisTicks = series.unit === 'count' && max <= 4
    ? Array.from({ length: max + 1 }, (_, index) => max - index) : ticks(max);
  const count = points.length;
  const spacing = count > 1 ? (width - LINE_INSET * 2) / (count - 1) : width;
  const xFor = (index) => (count > 1 ? LINE_INSET + index * spacing : width / 2);
  const yFor = (value) => LINE_HEIGHT - LINE_INSET - (value / max) * (LINE_HEIGHT - LINE_INSET * 2);
  const coords = values.map((value, index) => Number.isFinite(value) ? [xFor(index), yFor(value)] : null);
  const comparisonCoords = comparisonValues.map((value, index) => Number.isFinite(value) ? [xFor(index), yFor(value)] : null);
  const baseline = LINE_HEIGHT - LINE_INSET;
  const pathFor = data => data.map((coord, index) => coord
    ? `${index === 0 || !data[index - 1] ? 'M' : 'L'}${coord[0]},${coord[1]}` : '').join(' ');
  const linePath = pathFor(coords);
  const areaPath = !comparison && count > 1 && coords.every(Boolean)
    ? `${linePath} L${coords[count - 1][0]},${baseline} L${coords[0][0]},${baseline} Z` : '';
  const selectedPoint = selected !== null ? points[selected] : null;
  const readPoint = index => `${fullBucket(points[index].bucket)}: ${seriesLabel ? `${seriesLabel}: ` : ''}${formatValue(points[index].value, series.unit)}${comparison
    ? `; ${comparisonLabel}: ${formatValue(comparisonValues[index], series.unit)}` : ''}`;

  return (
    <View style={styles.chartCard}>
      <ChartReadout series={series} hidePeriodLabel={hidePeriodLabel} title={title} compact={!!comparison}>
        {values.every(value => value === null) || (dataMax === 0 && series.unit !== 'days') ? emptyText : null}
      </ChartReadout>
      {comparison ? <View style={styles.lineLegend}>
        {[seriesLabel, comparisonLabel].map((label, index) => <View key={label} style={styles.lineLegendRow}>
          <View style={[styles.legendSwatch, { backgroundColor: index === 0 ? COLORS.series : CATEGORY_COLORS[1] }]} />
          <Text numberOfLines={1} style={styles.lineLegendLabel}>{label}</Text>
        </View>)}
      </View> : null}

      <View style={styles.plotRow}>
        <ChartAxis max={max} unit={cleanHeader ? undefined : series.unit} tickValues={axisTicks} height={LINE_HEIGHT} inset={LINE_INSET} />
        <View style={[styles.plot, { height: LINE_HEIGHT }]} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
          {width > 0 ? (
            <Svg width={width} height={LINE_HEIGHT}>
              {axisTicks.slice(0, -1).map(value => <Line key={value} x1={0} x2={width} y1={yFor(value)} y2={yFor(value)} stroke={COLORS.grid} strokeWidth={1} />)}
              <Line x1={0} x2={width} y1={baseline} y2={baseline} stroke={COLORS.inkMuted} strokeWidth={1} />
              {areaPath ? <Path d={areaPath} fill={COLORS.series} fillOpacity={0.06} /> : null}
              {selectedPoint ? (
                <Line x1={xFor(selected)} x2={xFor(selected)} y1={LINE_INSET} y2={baseline}
                  stroke={COLORS.inkMuted} strokeWidth={1} strokeDasharray="3,3" />
              ) : null}
              {count > 1 ? (
                <Path d={linePath} stroke={COLORS.series} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              ) : null}
              {comparison ? <Path d={pathFor(comparisonCoords)} stroke={CATEGORY_COLORS[1]} strokeWidth={2} strokeDasharray="6,4" fill="none" /> : null}
              {comparisonCoords.map((coord, index) => coord ? <Circle key={points[index].bucket}
                cx={coord[0]} cy={coord[1]} r={4} fill={CATEGORY_COLORS[1]} stroke={COLORS.card} strokeWidth={2} /> : null)}
              {coords.map((coord, index) => coord ? (
                <Circle key={points[index].bucket} cx={coord[0]} cy={coord[1]} r={selected === index ? 6 : 4}
                  fill={COLORS.series} stroke={COLORS.card} strokeWidth={2} />
              ) : null)}
            </Svg>
          ) : null}
          {/* Hit targets are wider than the markers: one column per point */}
          {points.map((point, index) => (
            <Pressable
              key={point.bucket}
              style={[styles.lineHit, { left: xFor(index) - spacing / 2, width: Math.max(spacing, 24) }]}
              onPress={() => setSelected(selected === index ? null : index)}
              accessibilityRole="button"
              accessibilityLabel={readPoint(index)}
            />
          ))}
          {selectedPoint ? <PointTooltip text={readPoint(selected)} x={xFor(selected)}
            y={yFor(Math.max(values[selected] ?? 0, comparisonValues[selected] ?? 0))} plotWidth={width} plotHeight={LINE_HEIGHT} /> : null}
        </View>
      </View>

      <View style={[styles.xLabels, styles.lineLabels]}>
        {width > 0 ? points.map((point, index) => (
          <Text key={point.bucket} numberOfLines={1}
            style={[styles.xLabel, styles.lineLabel, { left: xFor(index) - spacing / 2, width: Math.max(spacing, 24) }]}>
            {showTrendLabel(index, points, showEveryMonth) ? shortBucket(point.bucket) : ''}
          </Text>
        )) : null}
      </View>
    </View>
  );
};

// ---------- Share bar ----------

/** Parts of a whole as one segmented bar, with a labelled legend so identity never relies on color alone. */
export const ShareBar = ({ series, emptyText }) => {

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

    </View>
  );
};

// ---------- Donut chart ----------

const DistributionChart = ({ series, emptyText, totalLabel = 'Total users', pie = false, totalMetric, metricLabel = 'Total', title, children }) => {
  if (!series || series.availability !== 'available') return <SeriesUnavailable series={series} title={title} />;
  const points = (series.points || []).map(point => ({ ...point, value: Math.max(0, Number(point.value) || 0) }));
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const radius = pie ? 80 : 68;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <View style={styles.chartCard}>
      {title ? <ChartReadout title={title} series={series} hidePeriodLabel compact /> : null}
      {totalMetric ? <View style={{ marginBottom: 20 }}><MetricRow label={metricLabel} metric={totalMetric} showInfo={!title} /></View> : null}
      {children}
      <View style={styles.donut} accessible accessibilityLabel={total > 0 || !emptyText ? totalLabel + ': ' + total : emptyText}>
        <Svg width={180} height={180}
          {...(Platform.OS === 'web'
            ? { 'aria-hidden': true }
            : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' })}>
          <Circle cx={90} cy={90} r={radius} fill={pie ? COLORS.border : 'none'} stroke={pie ? 'none' : COLORS.border} strokeWidth={24} />
          {total > 0 ? points.map((point, index) => {
            const length = point.value / total * circumference;
            const start = offset;
            offset += length;
            if (pie && point.value > 0) {
              const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
              if (point.value === total) return <Circle key={point.bucket} cx={90} cy={90} r={radius} fill={color} />;
              const startAngle = start / radius - Math.PI / 2;
              const endAngle = offset / radius - Math.PI / 2;
              const x = angle => 90 + radius * Math.cos(angle);
              const y = angle => 90 + radius * Math.sin(angle);
              return <Path key={point.bucket} fill={color}
                d={`M90 90 L${x(startAngle)} ${y(startAngle)} A${radius} ${radius} 0 ${point.value / total > 0.5 ? 1 : 0} 1 ${x(endAngle)} ${y(endAngle)} Z`} />;
            }
            return point.value > 0 ? (
              <Circle key={point.bucket} cx={90} cy={90} r={radius} fill="none"
                stroke={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} strokeWidth={24}
                strokeDasharray={[length, circumference]} strokeDashoffset={-start}
                transform="rotate(-90 90 90)" />
            ) : null;
          }) : null}
        </Svg>
        {!pie ? <View style={styles.donutCentre} pointerEvents="none">
          <Text style={styles.donutTotal}>{withCommas(total)}</Text>
          <Text style={styles.donutLabel}>{totalLabel}</Text>
        </View> : null}
      </View>
      {total === 0 && emptyText ? <Text style={styles.chartReadout}>{emptyText}</Text> : null}
      <View style={styles.shareLegend}>
        {points.map((point, index) => (
          <View key={point.bucket} style={styles.shareLegendRow}>
            <View style={[styles.legendSwatch, { backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }]} />
            <Text style={styles.shareLegendLabel}>{point.bucket}</Text>
            <Text style={styles.shareLegendValue}>{withCommas(point.value) + ' (' + (total === 0 ? '0.0' : (point.value / total * 100).toFixed(1)) + '%)'}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export const DonutChart = props => <DistributionChart {...props} />;
export const PieChart = props => <DistributionChart {...props} pie />;

export const MetricRow = ({ label, metric, change, scope, showInfo = true }) => {
  const [expanded, setExpanded] = useState(false);
  if (!metric) return null;
  const available = metric.availability === 'available';
  const comparison = available ? formatChange(change) : null;
  return (
    <Pressable style={styles.metricRow} onPress={() => setExpanded(value => !value)}
      accessibilityRole="button" accessibilityState={{ expanded }}
      accessibilityLabel={label + ': ' + (available ? formatValue(metric.value, metric.unit) : 'not available')}
      accessibilityHint="Shows how this metric is calculated">
      <View style={styles.metricRowMain}>
        <Text style={styles.metricRowLabel}>{label}</Text>{showInfo ? <FontAwesome name="info-circle" size={16} color={COLORS.inkSecondary} /> : null}
        <Text style={styles.metricRowValue}>{available ? formatValue(metric.value, metric.unit) : 'Not available'}</Text>
      </View>
      {visibleScopeFor(metric, scope) ? <Text style={styles.scope}>{visibleScopeFor(metric, scope)}</Text> : null}
      {comparison ? <Text style={styles.metricRowComparison}>{comparison}</Text> : null}
      {expanded ? <MetricDetails label={label} metric={metric} scope={scope} visible onClose={() => setExpanded(false)} /> : null}
    </Pressable>
  );
};

// ---------- Occupancy strip ----------

/** One cell per month: filled = occupied, outlined = vacant. Tap a cell to read it. */
export const OccupancyStrip = ({ series }) => {
  const [selected, setSelected] = useState(null);

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

    </View>
  );
};

const styles = StyleSheet.create({
  countBarRow: { marginBottom: 16 },
  countBarHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  countBarLabel: { flex: 1, fontSize: 14, lineHeight: 20, color: COLORS.ink },
  countBarValue: { fontSize: 16, fontWeight: '600', color: COLORS.ink, fontVariant: ['tabular-nums'] },
  countBarTrack: { height: 12, backgroundColor: COLORS.seriesTrack, borderRadius: 3, overflow: 'hidden' },
  countBarFill: { height: '100%', backgroundColor: COLORS.series, borderRadius: 3 },
  periodContainer: { marginBottom: 14 },
  periodControlRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  periodTrigger: { flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#C8C7C2', borderRadius: 8, backgroundColor: COLORS.surface },
  periodCaption: { fontSize: 14, lineHeight: 20, color: COLORS.inkSecondary, fontVariant: ['tabular-nums'] },
  periodSelectedLabel: { fontSize: 20, lineHeight: 26, fontWeight: '500', color: COLORS.ink },
  periodOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8 },
  periodMenu: { marginTop: 8, padding: 4, borderWidth: 1, borderColor: '#C8C7C2', borderRadius: 8 },
  periodOptionSelected: { backgroundColor: '#EAF5EE' },
  periodOptionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '500', color: COLORS.ink },
  chartHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  chartInfoButton: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  scope: { fontSize: 12, lineHeight: 18, color: COLORS.inkSecondary, marginTop: 4 },
  detailsBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  detailsPanel: { maxHeight: '80%', backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 32 },
  detailsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  detailsTitle: { flex: 1, fontSize: 20, fontWeight: '600', color: COLORS.ink },
  detailsClose: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  detailsValue: { fontSize: 28, fontWeight: '600', marginVertical: 12, color: COLORS.ink, fontVariant: ['tabular-nums'] },
  detailsBody: { fontSize: 16, lineHeight: 24, marginTop: 12, color: COLORS.inkSecondary },
  donut: { width: 180, height: 180, alignSelf: 'center', marginVertical: 8 },
  donutCentre: { position: 'absolute', top: 0, bottom: 0, left: 30, right: 30, alignItems: 'center', justifyContent: 'center' },
  donutTotal: { fontSize: 26, fontWeight: '700', color: COLORS.ink },
  donutLabel: { fontSize: 12, color: COLORS.inkSecondary, marginTop: 4 },
  metricRow: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  metricRowMain: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  metricRowLabel: { flex: 1, fontSize: 15, color: COLORS.inkSecondary },
  metricRowValue: { fontSize: 22, fontWeight: '600', color: COLORS.ink, flexShrink: 1 },
  metricRowComparison: { fontSize: 12, color: COLORS.inkSecondary, marginTop: 6, textAlign: 'right' },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18, fontWeight: '600', color: COLORS.ink, marginBottom: 8,
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
    flexGrow: 1, flexBasis: '45%', minWidth: 130, margin: 5, padding: 16, backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  tileLabel: {
    flex: 1,
    fontSize: 14, lineHeight: 20,
    color: COLORS.inkSecondary,
  },
  featuredTile: { backgroundColor: '#FAFAFA', borderColor: '#D8D8D8' },
  featuredValue: { fontSize: 28, fontWeight: '700' },
  wideTile: {
    flexBasis: '22%',
  },
  tileValue: {
    fontVariant: ['tabular-nums'], fontSize: 24, fontWeight: '600', color: COLORS.ink, marginTop: 10,
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
    paddingVertical: 14, paddingHorizontal: 0, marginTop: 10,
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
    flexWrap: 'wrap',
    rowGap: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  periodLabel: {
    fontSize: 14,
    color: COLORS.inkSecondary,
    marginRight: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
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
    paddingVertical: 16, paddingHorizontal: 12, backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginTop: 6,
  },
  chartReadout: {
    fontSize: 13, fontWeight: '400', color: COLORS.inkSecondary, marginBottom: 16,
  },
  plotRow: {
    flexDirection: 'row',
  },
  pointTooltip: {
    position: 'absolute', zIndex: 10, padding: 8, borderRadius: 6,
    backgroundColor: COLORS.ink, borderWidth: 1, borderColor: COLORS.ink,
  },
  pointTooltipText: { color: '#FFFFFF', fontSize: 13, lineHeight: 20 },
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
  lineLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  lineLegendRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  lineLegendLabel: { fontSize: 13, color: COLORS.ink, flexShrink: 0 },
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
});
