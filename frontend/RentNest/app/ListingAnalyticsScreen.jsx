import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from 'react-native-vector-icons';
import { ENDPOINTS } from '../config/api';
import AnalyticsLayout, { ActivitySection } from '../components/analytics/AnalyticsLayout';
import {
  COLORS,
  BarChart,
  resolvePeriodKey,
  ErrorState,
  LoadingState,
  MetricRow,
  OccupancyStrip,
  Section,
  StatTile,
  TileRow,
  formatValue,
  formatDay,
  useAnalytics,
} from '../components/analytics/AnalyticsKit';


const ListingAnalyticsScreen = () => {
  const router = useRouter();
  const { listingId, period: initialPeriod } = useLocalSearchParams();
  const [period, setPeriod] = useState(() => resolvePeriodKey(initialPeriod));
  const { data, loading, error, unauthenticated, retry } = useAnalytics(ENDPOINTS.ANALYTICS_OWNER_LISTING(listingId), period);

  const header = (
    <>
      <Stack.Screen options={{ title: 'Property analytics' }} />
      <View style={styles.header}>
        <Pressable style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/OwnerAnalyticsScreen')}
          accessibilityRole="button" accessibilityLabel="Back to owner analytics">
          <FontAwesome name="chevron-left" size={18} color="#101820" />
        </Pressable>
        <Text style={styles.headerTitle}>Property analytics</Text>
      </View>
    </>
  );

  if (unauthenticated) {
    return (
      <>
        {header}
        <ErrorState message={error || 'Please log in to view analytics.'} onRetry={() => router.replace('/LandingScreen')} actionLabel="Go to login" />
      </>
    );
  }
  if (!data && loading) return <LoadingState message="Loading analytics..." textStyle={styles.loadingText} />;
  if (!data) return <>{header}<ErrorState message={error} onRetry={retry} /></>;

  const m = data.metrics;
  const listing = data.listing || {};
  const occupied = m.occupancyStatus?.value === 'occupied';

  return (
    <>
      {header}
      <AnalyticsLayout compactTabs showPeriod={false} showRefresh={false} periodAccent="#16794B"
        period={period} onPeriodChange={setPeriod} loading={loading} error={error} onRefresh={retry} dataPeriod={data.period} asOf={data.asOf}
        header={<>
      <View style={styles.listingHeader}>
        {listing.listingPicture ? <Image source={{ uri: listing.listingPicture }} style={styles.image} /> : null}
        <View style={styles.listingText}>
          <Text style={styles.title}>{listing.name}</Text>
          <Text style={styles.subtitle}>{[listing.type, listing.location].filter(Boolean).join(' · ')}</Text>
          <View style={[styles.statusBadge, occupied ? styles.badgeOccupied : styles.badgeVacant]}>
            <Text style={[styles.statusText, occupied && styles.statusTextOccupied]}>
              {formatValue(m.occupancyStatus?.value, 'status')}
            </Text>
          </View>
        </View>
      </View>

        </>}>

      <ActivitySection period={period} onPeriodChange={setPeriod} loading={loading} onRefresh={retry} dataPeriod={data.period} asOf={data.asOf} lifetimeLabel="Since published">
        <Section title="Performance">
          <TileRow>
            <StatTile featured label="Rent recorded" metric={m.recordedRentPaymentTotal} />
            <StatTile featured label="Occupancy in period" metric={m.averageOccupancyRate} />
            <StatTile label="Payments recorded" metric={m.recordedRentPaymentCount} />
          </TileRow>
        </Section>
        <Section title="Listing interest"><TileRow>
          <StatTile label="Listing views" metric={m.listingViews} />
          <StatTile label="Unique viewers" metric={m.uniqueListingViewers} />
        </TileRow></Section>
        <Section title="Monthly rent recorded"><BarChart series={data.series.monthlyRecordedRentPayments} emptyText="No rent recorded in this period" /></Section>
        <Section title="Month by month"><OccupancyStrip series={data.series.monthlyOccupancy} /></Section>
      </ActivitySection>
      {!loading ? <><Section title="Listing history">
        <MetricRow label="Offers sent" scope="All time" metric={m.rentalRecordCount} />
        <MetricRow label="Offers accepted" scope="All time" metric={m.acceptedRentalRecordCount} />
        <MetricRow label="Acceptance rate" scope="All time" metric={m.acceptanceRate} />
        <TileRow>
          <StatTile label="Average tenancy" scope="All time" metric={m.averageTenancyMonths} />
          <StatTile label="Tenants hosted" scope="All time" metric={m.tenantsHostedCount} />
        </TileRow>
      </Section>
      <Section title="Time to accepted offer"><TileRow>
        <StatTile label="Days on market" scope="Listing history" metric={m.daysOnMarket} />
        <View style={styles.marketDates}>
          <Text style={styles.dateLabel}>Published</Text>
          <Text style={styles.dateValue}>{listing.listedAt ? formatDay(listing.listedAt) : 'Not recorded'}</Text>
          <Text style={styles.dateLabel}>First offer accepted</Text>
          <Text style={styles.dateValue}>{listing.firstAcceptedAt ? formatDay(listing.firstAcceptedAt) : 'Not recorded'}</Text>
        </View>
      </TileRow></Section></> : null}
      </AnalyticsLayout>
    </>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', width: '100%', maxWidth: 1120, alignSelf: 'center' },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  headerTitle: { flex: 1, marginLeft: 8, fontSize: 24, fontWeight: '700', textAlign: 'left', color: '#101820' },
  loadingText: { marginTop: 14, fontSize: 16, fontWeight: '600', color: '#101820' },
  marketDates: { flexGrow: 1, flexBasis: '45%', margin: 5, padding: 12, backgroundColor: COLORS.card, borderRadius: 12 },
  dateLabel: { fontSize: 12, color: COLORS.inkSecondary },
  dateValue: { fontSize: 15, color: COLORS.ink, fontWeight: '600', marginTop: 2, marginBottom: 10 },
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: COLORS.card,
  },
  listingText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.ink,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.inkSecondary,
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeOccupied: {
    backgroundColor: COLORS.series,
    borderColor: COLORS.series,
  },
  badgeVacant: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.vacantBorder,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink,
  },
  statusTextOccupied: {
    color: COLORS.surface,
  },
});

export default ListingAnalyticsScreen;
