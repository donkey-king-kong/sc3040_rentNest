import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

/**
 * AI Fair-Pricing Model card.
 *
 * Shows the estimated fair market rent for a property and three bands around it
 * (Excellent ±5%, Great ±10%, Good ±15%), in the style of a marketplace price
 * guide. When an asking price is known, the card says which band it falls in
 * and the premium or discount versus the fair price.
 *
 * Props:
 *  - estimate:       FairPriceEstimate object from /api/pricing (may be null)
 *  - loading:        show a spinner while the estimate is being fetched
 *  - askingPrice:    optional; overrides estimate.askingPrice (owner form flow)
 *  - onUseSuggested: optional; shows a "Use fair price" button calling back with the fair price
 *  - compact:        optional; tighter layout for embedding inside forms
 *  - aiExplanation:  optional; FairPriceExplanation from /api/pricing/listing/{id}/explanation
 *  - aiExplanationLoading: optional; show a spinner while the AI writes the explanation
 */
const TIER_STYLE = {
  EXCELLENT: { label: 'Excellent price', color: '#1b7f3b', bg: '#e6f4ea', band: '#a8dab5' },
  GREAT: { label: 'Great price', color: '#1f5fbf', bg: '#e8f0fe', band: '#b3cdf5' },
  GOOD: { label: 'Good price', color: '#b26a00', bg: '#fff4e5', band: '#f5d7a3' },
  OUTSIDE_RANGE: { label: 'Outside typical range', color: '#b3261e', bg: '#fdecea', band: '#eee' },
};

const money = (n) => (n == null ? '-' : `$${Number(n).toLocaleString()}`);

const Header = ({ pill }) => (
  <View style={styles.headerRow}>
    <FontAwesome name="magic" size={16} color="#000" />
    <Text style={styles.title}>AI Fair Price</Text>
    {pill}
  </View>
);

const FairPriceCard = ({ estimate, loading, askingPrice, onUseSuggested, compact, aiExplanation, aiExplanationLoading }) => {
  if (loading) {
    return (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <Header />
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#000" />
          <Text style={styles.loadingText}>Analysing comparable rentals...</Text>
        </View>
      </View>
    );
  }

  if (!estimate) return null;

  if (!estimate.available) {
    return (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <Header />
        <Text style={styles.muted}>{estimate.message || 'No estimate available for this property.'}</Text>
      </View>
    );
  }

  const { fairPrice, tiers = [], comparableCount, basis, confidence, periodStart, periodEnd, unitType, unitTypeSource, rentShare } = estimate;
  const roomLabel = unitType === 'MASTER_ROOM' ? 'master room' : unitType === 'COMMON_ROOM' ? 'common room' : null;
  const price = askingPrice != null && askingPrice !== '' && !isNaN(askingPrice) ? Number(askingPrice) : estimate.askingPrice;

  // Classify locally so the card stays correct while an owner edits the price.
  let tier = null;
  let pct = null;
  if (price != null && price > 0 && fairPrice > 0) {
    const hit = tiers.find((t) => price >= t.low && price <= t.high);
    tier = hit ? hit.name : 'OUTSIDE_RANGE';
    pct = ((price - fairPrice) / fairPrice) * 100;
  }
  const t = tier ? TIER_STYLE[tier] : null;

  // Bar spans the widest band plus a margin so an out-of-range price still shows.
  const widest = tiers[tiers.length - 1] || { low: fairPrice, high: fairPrice };
  const barMin = widest.low * 0.85;
  const barMax = widest.high * 1.15;
  const toPct = (x) => Math.min(100, Math.max(0, ((x - barMin) / (barMax - barMin)) * 100));
  // Draw widest band first so narrower bands sit on top.
  const bands = [...tiers].reverse();

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Header
        pill={t && (
          <View style={[styles.pill, { backgroundColor: t.bg }]}>
            <Text style={[styles.pillText, { color: t.color }]}>{t.label}</Text>
          </View>
        )}
      />

      <Text style={styles.fair}>
        {money(fairPrice)}
        <Text style={styles.perMonth}> /month fair market rent</Text>
      </Text>
      {roomLabel && (
        <Text style={styles.roomNote}>
          Priced as a {roomLabel}
          {unitTypeSource === 'AI' ? ' (detected by AI from the listing)' : ' (detected from the listing text)'}
          {rentShare ? `: about ${Math.round(rentShare * 100)}% of a whole flat's rent.` : '.'}
        </Text>
      )}

      {/* Nested bands */}
      <View style={styles.bar}>
        {bands.map((b) => (
          <View
            key={b.name}
            style={[styles.band, {
              left: `${toPct(b.low)}%`,
              width: `${toPct(b.high) - toPct(b.low)}%`,
              backgroundColor: TIER_STYLE[b.name].band,
            }]}
          />
        ))}
        <View style={[styles.fairMarker, { left: `${toPct(fairPrice)}%` }]} />
        {price != null && price > 0 && (
          <View style={[styles.marker, { left: `${toPct(price)}%`, backgroundColor: t ? t.color : '#000' }]} />
        )}
      </View>

      {/* Band legend */}
      <View style={styles.legend}>
        {tiers.map((b) => (
          <View key={b.name} style={styles.legendRow}>
            <View style={[styles.legendSwatch, { backgroundColor: TIER_STYLE[b.name].band }]} />
            <Text style={[styles.legendName, tier === b.name && { color: TIER_STYLE[b.name].color, fontWeight: 'bold' }]}>
              {TIER_STYLE[b.name].label.replace(' price', '')} (±{b.tolerancePercent}%)
            </Text>
            <Text style={styles.legendRange}>{money(b.low)} - {money(b.high)}</Text>
          </View>
        ))}
      </View>

      {t && pct != null && (
        <Text style={[styles.verdictText, { color: t.color }]}>
          {Math.abs(pct) < 0.5
            ? `Asking ${money(price)} matches the fair market rent.`
            : `Asking ${money(price)} is ${Math.abs(pct).toFixed(0)}% ${pct > 0 ? 'above' : 'below'} the fair market rent.`}
          {tier === 'OUTSIDE_RANGE' ? '' : ' Consider unit condition, furnishing and view when judging the premium.'}
        </Text>
      )}

      {aiExplanationLoading && (
        <View style={styles.aiBox}>
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#000" />
            <Text style={styles.loadingText}>AI is reviewing this listing...</Text>
          </View>
        </View>
      )}
      {!aiExplanationLoading && aiExplanation && (
        <View style={styles.aiBox}>
          <Text style={styles.aiTitle}>AI analysis</Text>
          {aiExplanation.available
            ? <Text style={styles.aiText}>{aiExplanation.explanation}</Text>
            : <Text style={styles.muted}>{aiExplanation.message}</Text>}
        </View>
      )}

      <Text style={styles.muted}>
        Based on {comparableCount} comparable {basis || 'transactions'}
        {periodStart && periodEnd ? ` (${periodStart} to ${periodEnd})` : ''}.
        {confidence ? ` Confidence: ${confidence.toLowerCase()}.` : ''}
      </Text>
      <Text style={styles.source}>
        Source: {estimate.dataSource === 'DEMO'
          ? 'Simulated demo transactions (not real market data)'
          : estimate.dataSource === 'HDB' ? 'HDB rental approvals (data.gov.sg)' : 'URA private rental contracts'}
      </Text>

      {onUseSuggested && (
        <TouchableOpacity style={styles.useButton} onPress={() => onUseSuggested(fairPrice)}>
          <Text style={styles.useButtonText}>Use fair price ({money(fairPrice)})</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 10,
    padding: 14,
    marginVertical: 10,
    backgroundColor: '#fff',
  },
  cardCompact: {
    marginVertical: 8,
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  fair: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  perMonth: {
    fontSize: 13,
    fontWeight: 'normal',
    color: '#555',
  },
  roomNote: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  bar: {
    height: 14,
    backgroundColor: '#f1f1f1',
    borderRadius: 7,
    marginTop: 12,
  },
  band: {
    position: 'absolute',
    top: 0,
    height: 14,
    borderRadius: 7,
  },
  fairMarker: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 20,
    marginLeft: -1,
    backgroundColor: '#000',
  },
  marker: {
    position: 'absolute',
    top: -5,
    width: 6,
    height: 24,
    marginLeft: -3,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#fff',
  },
  legend: {
    marginTop: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 8,
  },
  legendName: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },
  legendRange: {
    fontSize: 13,
    color: '#333',
  },
  verdictText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  muted: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  source: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#555',
  },
  aiBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f6f6f6',
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  aiText: {
    fontSize: 13,
    color: '#222',
    lineHeight: 19,
  },
  useButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  useButtonText: {
    fontWeight: 'bold',
    color: '#000',
  },
});

export default FairPriceCard;
