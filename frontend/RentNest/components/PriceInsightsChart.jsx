import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';

/**
 * Price Insights line chart: median monthly rent of comparable units.
 *
 * Props:
 *  - data:        [{ leaseDate: 'Sep 2026', rentPrice: 3650 }, ...] in any order (API sends newest first)
 *  - askingPrice: optional; drawn as a labelled reference line
 *
 * Months are placed on a real time scale, so a month with no transactions shows as a
 * longer segment rather than being squeezed out. Tap a point for its value; the exact
 * numbers are also available in the table view.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const INK = '#111111';          // series line and markers
const SURFACE = '#FFFFFF';
const GRID = '#E6E6E6';
const TEXT_PRIMARY = '#111111';
const TEXT_MUTED = '#6B6B6B';
const REFERENCE = '#9A9A9A';

const HEIGHT = 200;
// SVG text defaults to a serif font in browsers; native already uses the system font.
const FONT = Platform.OS === 'web' ? 'Helvetica, Arial, sans-serif' : undefined;
const HIT = 32;
const PAD = { top: 16, right: 56, bottom: 28, left: 52 };

const money = (n) => `$${Math.round(n).toLocaleString()}`;

/** "Sep 2026" -> month index (year * 12 + month), or null. */
const monthIndex = (label) => {
  const [mon, year] = String(label).split(' ');
  const m = MONTHS.indexOf(mon);
  const y = parseInt(year, 10);
  return m < 0 || Number.isNaN(y) ? null : y * 12 + m;
};

/** Clean tick values (multiples of 250 / 500 / 1,000 ...) covering [lo, hi]. */
const niceTicks = (lo, hi, target = 4) => {
  const raw = (hi - lo) / target || 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * pow).find((s) => s >= raw);
  const start = Math.floor(lo / step) * step;
  const ticks = [];
  for (let v = start; v <= hi + step * 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < hi) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
};

const PriceInsightsChart = ({ data = [], askingPrice }) => {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const points = useMemo(() => data
    .map((d) => ({ label: d.leaseDate, value: Number(d.rentPrice), t: monthIndex(d.leaseDate) }))
    .filter((p) => p.t !== null && p.value > 0)
    .sort((a, b) => a.t - b.t), [data]);

  if (points.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.muted}>No recent rental transactions found for similar units nearby.</Text>
      </View>
    );
  }

  const values = points.map((p) => p.value);
  const asking = Number(askingPrice) > 0 ? Number(askingPrice) : null;
  const lo = Math.min(...values, asking ?? Infinity);
  const hi = Math.max(...values, asking ?? -Infinity);
  const ticks = niceTicks(lo, hi);
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;
  const x = (t) => PAD.left + (tMax === tMin ? plotW / 2 : ((t - tMin) / (tMax - tMin)) * plotW);
  const y = (v) => PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t)},${y(p.value)}`).join(' ');
  const areaPath = `${linePath} L${x(tMax)},${y(yMin)} L${x(tMin)},${y(yMin)} Z`;

  // Month labels: every other point keeps 12 labels from colliding on a phone.
  const labelEvery = points.length > 6 ? 2 : 1;
  const last = points[points.length - 1];
  const active = selected !== null ? points[selected] : null;
  // Keep the latest-value label clear of the asking-price label in the same margin.
  let latestLabelY = y(last.value) + 4;
  if (asking && Math.abs(latestLabelY - y(asking)) < 28) {
    latestLabelY = y(asking) - (latestLabelY <= y(asking) ? 18 : -26);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.subtitle}>Median monthly rent of similar units, last {points.length} months with rentals</Text>

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            {ticks.map((v) => (
              <React.Fragment key={`tick-${v}`}>
                <Line x1={PAD.left} x2={PAD.left + plotW} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={1} />
                <SvgText x={PAD.left - 6} y={y(v) + 4} fontSize={10} fill={TEXT_MUTED} textAnchor="end" fontFamily={FONT}>{money(v)}</SvgText>
              </React.Fragment>
            ))}

            {asking && (
              <>
                <Line x1={PAD.left} x2={PAD.left + plotW} y1={y(asking)} y2={y(asking)} stroke={REFERENCE} strokeWidth={1} />
                <SvgText x={PAD.left + plotW + 8} y={y(asking) - 2} fontSize={10} fill={TEXT_MUTED} fontFamily={FONT}>Asking</SvgText>
                <SvgText x={PAD.left + plotW + 8} y={y(asking) + 10} fontSize={10} fill={TEXT_MUTED} fontFamily={FONT}>{money(asking)}</SvgText>
              </>
            )}

            <Path d={areaPath} fill={INK} fillOpacity={0.08} />
            <Path d={linePath} stroke={INK} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />

            {active && (
              <Line x1={x(active.t)} x2={x(active.t)} y1={PAD.top} y2={PAD.top + plotH} stroke={REFERENCE} strokeWidth={1} />
            )}

            {points.map((p, i) => (
              <React.Fragment key={p.label}>
                <Circle cx={x(p.t)} cy={y(p.value)} r={selected === i ? 6 : 4} fill={INK} stroke={SURFACE} strokeWidth={2} />
                {(i % labelEvery === (points.length - 1) % labelEvery) && (
                  <SvgText x={x(p.t)} y={HEIGHT - 8} fontSize={10} fill={TEXT_MUTED} textAnchor="middle" fontFamily={FONT}>
                    {p.label.split(' ')[0]}
                  </SvgText>
                )}
              </React.Fragment>
            ))}

            {/* Direct label on the latest month only, in the right margin beside the last point. */}
            <SvgText x={x(last.t) + 8} y={latestLabelY} fontSize={11} fontWeight="bold" fill={TEXT_PRIMARY} fontFamily={FONT}>
              {money(last.value)}
            </SvgText>
          </Svg>
        )}
        {/* Tap targets larger than the dots, laid over the chart. */}
        {width > 0 && points.map((p, i) => (
          <TouchableOpacity
            key={`hit-${p.label}`}
            accessibilityLabel={`${p.label}: median ${money(p.value)}`}
            onPress={() => setSelected(selected === i ? null : i)}
            style={[styles.hit, { left: x(p.t) - HIT / 2, top: y(p.value) - HIT / 2 }]}
          />
        ))}
      </View>

      <Text style={styles.readout}>
        {active
          ? `${active.label}: median ${money(active.value)}`
          : `Latest (${last.label}): ${money(last.value)} · ${points[0].label} – ${last.label}. Tap a point for details.`}
      </Text>

      <TouchableOpacity onPress={() => setShowTable(!showTable)}>
        <Text style={styles.toggle}>{showTable ? 'Hide table' : 'Show table'}</Text>
      </TouchableOpacity>
      {showTable && (
        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={styles.cellHeader}>Month</Text>
            <Text style={styles.cellHeader}>Median Rent</Text>
          </View>
          {[...points].reverse().map((p) => (
            <View key={p.label} style={styles.row}>
              <Text style={styles.cell}>{p.label}</Text>
              <Text style={styles.cell}>{money(p.value)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
    backgroundColor: SURFACE,
  },
  subtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 6,
  },
  readout: {
    fontSize: 12,
    color: TEXT_PRIMARY,
    marginTop: 4,
  },
  muted: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  toggle: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    textDecorationLine: 'underline',
    marginTop: 8,
  },
  table: {
    marginTop: 6,
  },
  hit: {
    position: 'absolute',
    width: HIT,
    height: HIT,
    borderRadius: HIT / 2,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingVertical: 6,
  },
  cellHeader: {
    flex: 1,
    fontWeight: 'bold',
    fontSize: 13,
    color: TEXT_PRIMARY,
  },
  cell: {
    flex: 1,
    fontSize: 13,
    color: TEXT_PRIMARY,
  },
});

export default PriceInsightsChart;
