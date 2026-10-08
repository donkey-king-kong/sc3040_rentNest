import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { FontAwesome } from 'react-native-vector-icons';
import { COLORS, MetricDetails } from './AnalyticsKit';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const statusFor = point => point.availability !== 'unavailable' && ['occupied', 'vacant'].includes(point.value)
  ? point.value : 'unavailable';
const statusLabel = status => ({ occupied: 'Occupied', vacant: 'Vacant', unavailable: 'Not available' }[status]);
const monthFor = bucket => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(bucket || '');
  return match ? { year: match[1], month: MONTHS[Number(match[2]) - 1] }
    : { year: 'Other dates', month: String(bucket || 'Unknown month') };
};

// Monthly occupancy records overlap, not the percentage of days occupied.
export default function ListingOccupancyCalendar({ series }) {
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 360 || fontScale > 1.2;
  const [selected, setSelected] = useState(null);
  const [showDefinition, setShowDefinition] = useState(false);
  useEffect(() => setSelected(null), [series]);
  const available = series?.availability === 'available';
  const points = available ? series.points || [] : [];
  const selectedPoint = points.find(point => point.bucket === selected);
  const selectedStatus = selectedPoint ? statusFor(selectedPoint) : null;
  const fullMonth = point => {
    const { month, year } = monthFor(point.bucket);
    return year === 'Other dates' ? month : `${month} ${year}`;
  };

  return <View style={styles.card}>
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={styles.title}>Monthly Occupancy</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Monthly occupancy calculation details"
        onPress={() => setShowDefinition(true)} style={styles.info}>
        <FontAwesome name="info-circle" size={18} color={COLORS.inkSecondary} />
      </Pressable>
    </View>
    {available && points.length > 0 ? <>
      <Text style={styles.note}>Occupied means a tenancy overlapped at least part of the month.</Text>
      <View style={styles.grid}>
          {points.map(point => {
            const status = statusFor(point);
            const isSelected = selected === point.bucket;
            const { month, year } = monthFor(point.bucket);
            return <View key={point.bucket} style={[styles.monthSlot, compact && styles.compactSlot]}><Pressable accessibilityRole="button"
              accessibilityLabel={`${fullMonth(point)}: ${statusLabel(status)}`}
              accessibilityHint="Shows this month's occupancy details"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelected(isSelected ? null : point.bucket)}
              style={({ pressed }) => [styles.month, isSelected && styles.selectedMonth, pressed && styles.pressed]}>
              <View style={styles.monthHeading}>
                <Text style={styles.monthLabel}>{`${month.slice(0, 3)}${year === 'Other dates' ? '' : ' ' + year}`}</Text>
                {isSelected ? <FontAwesome name="check" size={12} color="#16794B" /> : null}
              </View>
              <View style={styles.statusRow}>
                <FontAwesome name={status === 'occupied' ? 'circle' : status === 'vacant' ? 'circle-o' : 'question-circle'} size={9} color={COLORS.inkSecondary} />
                <Text style={styles.status}>{statusLabel(status)}</Text>
              </View>
            </Pressable></View>;
          })}
      </View>
      <View style={styles.readout} accessibilityLiveRegion="polite">
        {selectedPoint ? <>
          <Text style={styles.readoutTitle}>{`${fullMonth(selectedPoint)}: ${statusLabel(selectedStatus)}`}</Text>
          <Text style={styles.note}>{selectedStatus === 'occupied'
            ? 'An accepted tenancy covered at least part of this month.'
            : selectedStatus === 'vacant' ? 'No accepted tenancy overlapped this month.'
              : 'Occupancy was not recorded for this month.'}</Text>
        </> : <Text style={styles.note}>Select a month for details.</Text>}
      </View>
    </> : <View style={styles.empty}>
      <Text style={styles.readoutTitle}>{available ? 'No occupancy history yet' : 'Not available'}</Text>
      {series?.reason ? <Text style={styles.note}>{series.reason}</Text> : null}
    </View>}
    {showDefinition ? <MetricDetails label="Monthly Occupancy" metric={series} hideValue visible
      onClose={() => setShowDefinition(false)} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { padding: 16, backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginTop: 6 },
  heading: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  title: { flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.ink },
  info: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -12, marginVertical: -8 },
  note: { fontSize: 13, lineHeight: 19, color: COLORS.inkSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginTop: 12 },
  monthSlot: { width: '33.333333%', padding: 4 },
  compactSlot: { width: '50%' },
  month: { flex: 1, minHeight: 68, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  selectedMonth: { borderColor: '#16794B', backgroundColor: '#F3F8F5' },
  pressed: { opacity: 0.7 },
  monthHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  monthLabel: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: COLORS.ink },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  status: { flexShrink: 1, fontSize: 12, lineHeight: 17, color: COLORS.inkSecondary },
  readout: { minHeight: 60, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 16, paddingTop: 12 },
  readoutTitle: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: COLORS.ink, marginBottom: 4 },
  empty: { paddingTop: 12, paddingBottom: 8 },
});
