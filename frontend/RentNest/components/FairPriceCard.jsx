import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

/**
 * AI Fair-Pricing Model card.
 *
 * Shows how a listing's asking rent compares with the fair market rent of similar
 * units. The verdict is a neutral market gauge (how close to market, and in which
 * direction), so it reads correctly for both tenants and owners. Supporting detail
 * (band ranges, method, data citations) sits behind "Why this price?".
 *
 * Props:
 *  - estimate:       FairPriceEstimate object from /api/pricing (may be null)
 *  - loading:        show a spinner while the estimate is being fetched
 *  - askingPrice:    optional; overrides estimate.askingPrice (owner form flow)
 *  - onUseSuggested: optional; shows a "Use fair price" button (owner form). Also switches
 *                    the advice line from tenant wording to owner wording.
 *  - compact:        optional; tighter layout for embedding inside forms
 *  - aiExplanation:  optional; FairPriceExplanation from /api/pricing/listing/{id}/explanation
 *  - aiExplanationLoading: optional; show a spinner while the AI writes the explanation
 */

// The bands are ordered (closer to market = darker), so they use one blue ramp,
// validated as an ordinal ramp against the white card. Text stays in ink colours;
// band colour only appears in swatches and bar fills.
const TIER_STYLE = {
  EXCELLENT: { label: 'Close to market', band: '#184f95' },
  GREAT: { label: 'Within typical range', band: '#3987e5' },
  GOOD: { label: 'Edge of typical range', band: '#86b6ef' },
  OUTSIDE_RANGE: { label: 'Unusual for this area', band: null },
};
const INK = '#0b0b0b';
const INK_SECONDARY = '#52514e';   // 7.9:1 on white
const HAIRLINE = '#D8D7D3';
const SUBTLE = '#F4F3F0';
const SURFACE = '#FFFFFF';
const WARNING_INK = '#9a5b00';     // 4.7:1 on the badge background, 5.4:1 on white

const DATA_SOURCES = {
  HDB: 'HDB rental approvals, Housing & Development Board, via data.gov.sg (Singapore Open Data Licence)',
  URA: 'Private residential rental contracts, Urban Redevelopment Authority (URA Data Service)',
  DEMO: 'Simulated demo transactions. Not real market data',
};
const ROOM_SHARE_SOURCE = 'Room share: 2026 median room rents (Hozuko room-rent snapshot) compared with official HDB/URA whole-unit medians for the same period';

const money = (n) => (n == null ? '-' : `$${Math.round(Number(n)).toLocaleString()}`);

/** Card header; tapping it collapses or expands the card when onToggle is given. */
const Header = ({ badge, open, onToggle }) => {
  const content = (
    <>
      <FontAwesome name="balance-scale" size={15} color={INK} />
      <Text style={styles.title}>AI Fair Price</Text>
      {badge}
      {onToggle && (
        <FontAwesome name={open ? 'chevron-up' : 'chevron-down'} size={13} color={INK_SECONDARY} style={styles.chevron} />
      )}
    </>
  );
  if (!onToggle) return <View style={styles.headerRow}>{content}</View>;
  return (
    <TouchableOpacity
      style={[styles.headerRow, styles.headerTouchable, !open && styles.headerCollapsed]}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel="AI Fair Price"
    >
      {content}
    </TouchableOpacity>
  );
};

/** One-line advice that depends on direction, worded for the person looking at the card. */
const adviceFor = (pct, isOwner) => {
  if (pct == null) return null;
  if (Math.abs(pct) < 2) {
    return isOwner ? 'Your rent is in line with similar rentals nearby.' : 'In line with similar rentals nearby.';
  }
  if (pct < 0) {
    return isOwner
      ? 'Below similar rentals nearby. You may be able to ask for more.'
      : 'Below similar rentals nearby. Ask the owner why, for example condition, lease terms or what is included.';
  }
  return isOwner
    ? 'Above similar rentals nearby. Explain what justifies it (renovation, furnishing, view) in your description.'
    : 'Above similar rentals nearby. Ask what justifies the premium, for example renovation, furnishing or view.';
};

const FairPriceCard = ({ estimate, loading, askingPrice, onUseSuggested, compact, aiExplanation, aiExplanationLoading }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [open, setOpen] = useState(true);

  if (loading) {
    return (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <Header />
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={INK} />
          <Text style={styles.loadingText}>Comparing with recent rentals nearby…</Text>
        </View>
      </View>
    );
  }

  if (!estimate) return null;

  if (!estimate.available) {
    return (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <Header />
        <Text style={styles.secondary}>{estimate.message || 'No estimate available for this property.'}</Text>
      </View>
    );
  }

  const { fairPrice, tiers = [], comparableCount, basis, confidence, periodStart, periodEnd, unitType, unitTypeSource, rentShare } = estimate;
  const roomLabel = unitType === 'MASTER_ROOM' ? 'master room' : unitType === 'COMMON_ROOM' ? 'common room' : null;
  const price = askingPrice != null && askingPrice !== '' && !isNaN(askingPrice) ? Number(askingPrice) : estimate.askingPrice;
  const hasPrice = price != null && price > 0 && fairPrice > 0;
  const isOwner = !!onUseSuggested;

  // Classify locally so the card stays correct while an owner edits the price.
  let tier = null;
  let pct = null;
  if (hasPrice) {
    const hit = tiers.find((b) => price >= b.low && price <= b.high);
    tier = hit ? hit.name : 'OUTSIDE_RANGE';
    pct = ((price - fairPrice) / fairPrice) * 100;
  }
  const t = tier ? TIER_STYLE[tier] : null;
  const pctText = pct == null ? null : `${Math.round(Math.abs(pct))}%`;
  const diff = hasPrice ? Math.abs(price - fairPrice) : 0;
  const headline = !hasPrice
    ? `${money(fairPrice)}/mo fair rent`
    : Math.abs(pct) < 0.5
      ? 'In line with market'
      : `${money(diff)} ${pct < 0 ? 'below' : 'above'} market`;

  // The scale spans the widest band plus a margin so an out-of-range price still shows.
  const widest = tiers[tiers.length - 1] || { low: fairPrice, high: fairPrice };
  const barMin = Math.min(widest.low * 0.85, hasPrice ? price * 0.97 : Infinity);
  const barMax = Math.max(widest.high * 1.15, hasPrice ? price * 1.03 : -Infinity);
  const toPct = (x) => Math.min(100, Math.max(0, ((x - barMin) / (barMax - barMin)) * 100));
  // Nested bands drawn as adjacent segments: Edge | Typical | Close | Typical | Edge.
  const byName = Object.fromEntries(tiers.map((b) => [b.name, b]));
  const order = ['GOOD', 'GREAT', 'EXCELLENT'].filter((n) => byName[n]);
  const segments = [];
  order.forEach((name, i) => {
    const outer = byName[name];
    const inner = byName[order[i + 1]];
    segments.push({ name, from: outer.low, to: inner ? inner.low : outer.high });
  });
  for (let i = order.length - 2; i >= 0; i -= 1) {
    segments.push({ name: order[i], from: byName[order[i + 1]].high, to: byName[order[i]].high });
  }
  const closest = byName.EXCELLENT;
  const scaleLabel = `Price scale. Fair rent ${money(fairPrice)}.`
    + (hasPrice ? ` Asking ${money(price)}, ${pctText} ${pct < 0 ? 'below' : 'above'} fair rent.` : '')
    + (closest ? ` Close to market is ${money(closest.low)} to ${money(closest.high)}.` : '');

  const source = DATA_SOURCES[estimate.dataSource] || DATA_SOURCES.URA;
  const advice = adviceFor(pct, isOwner);

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Header
        open={open}
        onToggle={() => setOpen(!open)}
        badge={t && (
          <View style={styles.badge} accessibilityLabel={`Verdict: ${t.label}`}>
            {t.band
              ? <View style={[styles.badgeSwatch, { backgroundColor: t.band }]} />
              : <FontAwesome name="exclamation-triangle" size={11} color={WARNING_INK} style={styles.badgeIcon} />}
            <Text style={styles.badgeText}>{t.label}</Text>
          </View>
        )}
      />

      {open && (<>
      <Text style={styles.headline}>{headline}</Text>
      {hasPrice && (
        <Text style={styles.subline}>
          Asking {money(price)} vs fair rent {money(fairPrice)}{Math.abs(pct) >= 0.5 ? ` (${pctText} ${pct < 0 ? 'below' : 'above'})` : ''}
        </Text>
      )}
      {roomLabel && (
        <Text style={styles.secondary}>
          Priced as a {roomLabel} ({unitTypeSource === 'AI' ? 'detected by AI from the listing' : 'detected from the listing text'})
          {rentShare ? `, about ${Math.round(rentShare * 100)}% of a whole unit's rent.` : '.'}
        </Text>
      )}

      <View style={styles.bar} accessible accessibilityLabel={scaleLabel}>
        <View style={styles.trackLine} />
        {segments.map((seg, i) => (
          <View
            key={`${seg.name}-${i}`}
            style={[styles.band, {
              left: `${toPct(seg.from)}%`,
              width: `${toPct(seg.to) - toPct(seg.from)}%`,
              backgroundColor: TIER_STYLE[seg.name].band,
              borderRightWidth: i < segments.length - 1 ? 2 : 0,
            }, i === 0 && styles.bandStart, i === segments.length - 1 && styles.bandEnd]}
          />
        ))}
        <View style={[styles.fairMarker, { left: `${toPct(fairPrice)}%` }]} />
        {hasPrice && <View style={[styles.marker, { left: `${toPct(price)}%` }]} />}
      </View>
      <View style={styles.barKey} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View style={styles.barKeyItem}>
          <View style={styles.keyTick} />
          <Text style={styles.barKeyText}>Fair rent</Text>
        </View>
        {hasPrice && (
          <View style={styles.barKeyItem}>
            <View style={styles.keyDot} />
            <Text style={styles.barKeyText}>Asking</Text>
          </View>
        )}
      </View>

      {advice && <Text style={styles.advice}>{advice}</Text>}

      {aiExplanationLoading && (
        <View style={styles.aiBox}>
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={INK} />
            <Text style={styles.loadingText}>AI is reading the listing description…</Text>
          </View>
        </View>
      )}
      {!aiExplanationLoading && aiExplanation && (
        <View style={styles.aiBox} accessibilityLiveRegion="polite">
          <Text style={styles.aiTitle}>AI analysis</Text>
          {aiExplanation.available ? (
            <>
              <Text style={styles.aiText} numberOfLines={aiExpanded ? undefined : 3}>{aiExplanation.explanation}</Text>
              <TouchableOpacity
                onPress={() => setAiExpanded(!aiExpanded)}
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <Text style={styles.link}>{aiExpanded ? 'Show less' : 'Read more'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.secondary}>{aiExplanation.message}</Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.detailsToggle}
        onPress={() => setShowDetails(!showDetails)}
        accessibilityRole="button"
        accessibilityState={{ expanded: showDetails }}
      >
        <Text style={styles.detailsToggleText}>Why this price?</Text>
        <FontAwesome name={showDetails ? 'chevron-up' : 'chevron-down'} size={12} color={INK_SECONDARY} />
      </TouchableOpacity>

      {showDetails && (
        <View style={styles.details}>
          {tiers.map((b) => (
            <View key={b.name} style={styles.legendRow}>
              <View style={[styles.legendSwatch, { backgroundColor: TIER_STYLE[b.name].band }]} />
              <Text style={[styles.legendName, tier === b.name && styles.legendActive]}>
                {TIER_STYLE[b.name].label} (±{b.tolerancePercent}%)
              </Text>
              <Text style={[styles.legendRange, tier === b.name && styles.legendActive]}>
                {money(b.low)} – {money(b.high)}
              </Text>
            </View>
          ))}
          <Text style={styles.detailText}>
            Fair rent is the typical rent for similar units nearby, adjusted for floor and size, with recent rentals counting more.
          </Text>
          <Text style={styles.detailText}>
            Based on {comparableCount} {basis || 'comparable rentals'}
            {periodStart && periodEnd ? `, ${periodStart} to ${periodEnd}` : ''}.
            {confidence ? ` Confidence: ${confidence.toLowerCase()} (${confidence === 'HIGH' ? '15 or more' : confidence === 'MEDIUM' ? '8 to 14' : 'fewer than 8'} comparable rentals).` : ''}
          </Text>
          <Text style={styles.source}>Data: {source}.</Text>
          {roomLabel && <Text style={styles.source}>{ROOM_SHARE_SOURCE}.</Text>}
        </View>
      )}

      {onUseSuggested && (
        <TouchableOpacity style={styles.useButton} onPress={() => onUseSuggested(fairPrice)} accessibilityRole="button">
          <Text style={styles.useButtonText}>Use fair rent ({money(fairPrice)})</Text>
        </TouchableOpacity>
      )}
      </>)}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
    backgroundColor: SURFACE,
  },
  cardCompact: {
    marginVertical: 8,
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTouchable: {
    minHeight: 44,
    marginTop: -8,
    marginBottom: 2,
  },
  headerCollapsed: {
    marginBottom: -8,
  },
  chevron: {
    marginLeft: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: INK,
    marginLeft: 8,
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: SUBTLE,
  },
  badgeSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  badgeIcon: {
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: INK,
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    color: INK,
  },
  subline: {
    fontSize: 14,
    color: INK_SECONDARY,
    marginTop: 2,
  },
  secondary: {
    fontSize: 13,
    color: INK_SECONDARY,
    marginTop: 6,
    lineHeight: 18,
  },
  bar: {
    height: 12,
    marginTop: 18,
  },
  trackLine: {
    position: 'absolute',
    top: 5,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: HAIRLINE,
  },
  band: {
    position: 'absolute',
    top: 0,
    height: 12,
    borderColor: SURFACE,
  },
  bandStart: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  bandEnd: {
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  fairMarker: {
    position: 'absolute',
    top: -4,
    width: 2,
    height: 20,
    marginLeft: -1,
    backgroundColor: INK_SECONDARY,
  },
  marker: {
    position: 'absolute',
    top: -3,
    width: 18,
    height: 18,
    marginLeft: -9,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: SURFACE,
    backgroundColor: INK,
  },
  barKey: {
    flexDirection: 'row',
    marginTop: 8,
  },
  barKeyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  keyTick: {
    width: 2,
    height: 12,
    backgroundColor: INK_SECONDARY,
    marginRight: 6,
  },
  keyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: INK,
    marginRight: 6,
  },
  barKeyText: {
    fontSize: 12,
    color: INK_SECONDARY,
  },
  advice: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 20,
    color: INK,
  },
  aiBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: SUBTLE,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: INK,
    marginBottom: 4,
  },
  aiText: {
    fontSize: 14,
    color: INK,
    lineHeight: 20,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
    color: INK,
    textDecorationLine: 'underline',
    marginTop: 6,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
  },
  detailsToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: INK,
  },
  details: {
    paddingBottom: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
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
    color: INK_SECONDARY,
  },
  legendRange: {
    fontSize: 13,
    color: INK_SECONDARY,
  },
  legendActive: {
    color: INK,
    fontWeight: '700',
  },
  detailText: {
    fontSize: 13,
    color: INK_SECONDARY,
    lineHeight: 18,
    marginTop: 10,
  },
  source: {
    fontSize: 12,
    color: INK_SECONDARY,
    lineHeight: 17,
    marginTop: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: INK_SECONDARY,
  },
  useButton: {
    marginTop: 12,
    minHeight: 44,
    borderWidth: 1,
    borderColor: INK,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useButtonText: {
    fontWeight: '600',
    color: INK,
  },
});

export default FairPriceCard;
