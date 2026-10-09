import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';

/**
 * Price Insights line chart: median monthly rent of comparable units.
 *
 * Props:
 *  - data:        [{ leaseDate: 'Sep 2026', rentPrice: 3650 }, ...] in any order (API sends newest first)
 *  - askingPrice: optional; drawn as a labelled reference line
 *  - fairPrice:   optional; the AI fair rent, drawn as a second labelled reference line
 *
 * Months are placed on a real time scale, so a month with no transactions shows as a
 * longer segment rather than being squeezed out. Tap a point for its value; the exact
 * numbers are also available in the table view. The whole section collapses from its header.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const INK = '#111111';          // series line and markers
const SURFACE = '#FFFFFF';
const GRID = '#E6E6E6';
const TEXT_PRIMARY = '#111111';
const TEXT_MUTED = '#52514e';
const REFERENCE = '#9A9A9A';     // selection rule only
// Reference lines: told apart by pattern (long dash vs dots) and named in the key below the chart.
const ASKING_LINE = { stroke: '#3d3d3a', strokeWidth: 2, strokeDasharray: '7 4' };
const FAIR_LINE = { stroke: '#52514e', strokeWidth: 2, strokeDasharray: '0.1 4', strokeLinecap: 'round' };

const HEIGHT = 200;
// SVG text defaults to a serif font in browsers; native already uses the system font.
const FONT = Platform.OS === 'web' ? 'Helvetica, Arial, sans-serif' : undefined;
const HIT = 32;
const PAD = { top: 16, right: 16, bottom: 28, left: 52 };

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

const PriceInsightsChart = ({ data = [], askingPrice, fairPrice }) => {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [open, setOpen] = useState(true);

  const points = useMemo(() => data
    .map((d) => ({ label: d.leaseDate, value: Number(d.rentPrice), t: monthIndex(d.leaseDate) }))
    .filter((p) => p.t !== null && p.value > 0)
    .sort((a, b) => a.t - b.t), [data]);

  useEffect(() => {
    if (data.length > 0 && points.length === 0) {
      console.warn('[PriceInsights] Chart received data but no points were chartable', {
        rawCount: data.length,
        sample: data.slice(0, 5),
        expectedDateFormat: 'MMM yyyy, for example Sep 2026',
      });
    }
  }, [data, points]);

  const header = (
    <TouchableOpacity
      style={styles.header}
      onPress={() => setOpen(!open)}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel="Price Insights"
    >
      <Text style={styles.title}>Price Insights</Text>
      <FontAwesome name={open ? 'chevron-up' : 'chevron-down'} size={13} color={TEXT_MUTED} />
    </TouchableOpacity>
  );

  if (points.length === 0) {
    return (
      <View style={styles.card}>
        {header}
        {open && <Text style={styles.muted}>No recent rental transactions found for similar units nearby.</Text>}
      </View>
    );
  }

  const values = points.map((p) => p.value);
  const asking = Number(askingPrice) > 0 ? Number(askingPrice) : null;
  const fair = Number(fairPrice) > 0 ? Number(fairPrice) : null;
  const refs = [asking, fair].filter((v) => v !== null);
  const rawLo = Math.min(...values, ...refs);
  const rawHi = Math.max(...values, ...refs);
  // Pad the domain so lines never sit on the axis and month-to-month swings are not exaggerated.
  const pad = Math.max((rawHi - rawLo) * 0.15, 100);
  const ticks = niceTicks(rawLo - pad, rawHi + pad);
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
  const active = selected !== null ? points[selected] : null;

  return (
    <View style={styles.card}>
      {header}
      {open && (<>
      <Text style={styles.subtitle}>
        Median monthly rent of similar units, one point per month with rentals.
      </Text>

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            {ticks.map((v) => (
              <React.Fragment key={`tick-${v}`}>
                <Line x1={PAD.left} x2={PAD.left + plotW} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={1} />
                <SvgText x={PAD.left - 6} y={y(v) + 4} fontSize={10} fill={TEXT_MUTED} textAnchor="end" fontFamily={FONT}>{money(v)}</SvgText>
              </React.Fragment>
            ))}

            {asking && <Line x1={PAD.left} x2={PAD.left + plotW} y1={y(asking)} y2={y(asking)} {...ASKING_LINE} />}
            {fair && <Line x1={PAD.left} x2={PAD.left + plotW} y1={y(fair)} y2={y(fair)} {...FAIR_LINE} />}

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

      {(asking || fair) && (
        <View style={styles.key}>
          {asking && (
            <View style={styles.keyItem}>
              <Svg width={28} height={8}><Line x1={0} x2={28} y1={4} y2={4} {...ASKING_LINE} /></Svg>
              <Text style={styles.keyText}>Asking {money(asking)}</Text>
            </View>
          )}
          {fair && (
            <View style={styles.keyItem}>
              <Svg width={28} height={8}><Line x1={2} x2={28} y1={4} y2={4} {...FAIR_LINE} /></Svg>
              <Text style={styles.keyText}>Fair rent {money(fair)}</Text>
            </View>
          )}
        </View>
      )}

      <Text style={styles.readout}>
        {active
          ? `${active.label}: median ${money(active.value)}`
          : 'Tap a point for details.'}
      </Text>

      <TouchableOpacity onPress={() => setShowTable(!showTable)} accessibilityRole="button" style={styles.toggleHit}>
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
      </>)}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#D8D7D3',
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
    backgroundColor: SURFACE,
  },
  key: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 8,
  },
  keyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 18,
    marginTop: 4,
  },
  keyText: {
    marginLeft: 8,
    fontSize: 13,
    color: TEXT_PRIMARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
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
  },
  table: {
    marginTop: 6,
  },
  toggleHit: {
    minHeight: 44,
    justifyContent: 'center',
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
