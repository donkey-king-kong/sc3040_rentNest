import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from 'react-native-vector-icons';
import AnalyticsLayout, { ActivitySection, RefreshControl } from '../components/analytics/AnalyticsLayout';
import { ENDPOINTS } from '../config/api';
import {
  COLORS,
  CountBarChart,
  resolvePeriodKey,
  ErrorState,
  LineChart,
  LoadingState,
  MetricRow,
  Section,
  StatTile,
  TileRow,
  useAnalytics,
  useOwnedListings,
} from '../components/analytics/AnalyticsKit';

const OwnerAnalyticsScreen = () => {
  const router = useRouter();
  const [tab, setTab] = useState('Overview');
  const { period: initialPeriod } = useLocalSearchParams();
  const [period, setPeriod] = useState(() => resolvePeriodKey(initialPeriod));
  const { data, loading, error, unauthenticated, retry } = useAnalytics(ENDPOINTS.ANALYTICS_OWNER_SUMMARY, period);
  const [refreshKey, setRefreshKey] = useState(0);
  const listings = useOwnedListings(refreshKey);
  const refresh = () => { retry(); setRefreshKey(value => value + 1); };

  const header = (
    <>
      <Stack.Screen options={{ title: 'Analytics' }} />
      <View style={styles.header}>
        <Pressable style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/ProfileScreen')}
          accessibilityRole="button" accessibilityLabel="Back to profile">
          <FontAwesome name="chevron-left" size={18} color="#101820" />
        </Pressable>
        <Text style={styles.headerTitle}>Analytics</Text>
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
  const vacantListings = m.listingCount?.availability === 'available' && m.activeTenancyCount?.availability === 'available' && m.listingCount.value >= m.activeTenancyCount.value
    ? { ...m.listingCount, value: m.listingCount.value - m.activeTenancyCount.value, definition: 'Current listings minus currently occupied listings.' }
    : { availability: 'unavailable', unit: 'count', reason: 'Current listing counts cannot be reconciled.' };

  return (
    <>
      {header}
      <AnalyticsLayout compactTabs periodAccent="#16794B" showPeriod={false} showRefresh={false}
        tabs={['Overview', 'Properties']} tab={tab} onTabChange={setTab}
        period={period} onPeriodChange={setPeriod} loading={loading} error={error} onRefresh={refresh} dataPeriod={data.period} asOf={data.asOf}>
        {tab === 'Overview' ? <>
          <Section title="Overview" action={
            <RefreshControl onRefresh={refresh} loading={loading} asOf={data.asOf} />
          }>
            <TileRow>
              <StatTile label="Listings" scope="Now" metric={m.listingCount} />
              <StatTile label="Occupied listings" scope="Now" metric={m.activeTenancyCount} />
              <StatTile label="Vacant listings" scope="Now" metric={vacantListings} />
              <StatTile label="Occupancy rate" scope="Now" metric={m.occupancyRate} />
            </TileRow>
            <TileRow>
              <StatTile label="Tenants hosted" scope="All time" metric={m.tenantsHostedCount} />
              <StatTile label="Average tenancy" scope="All time" metric={m.averageTenancyMonths} />
              <StatTile label="Owner rating" scope="All time" metric={m.ownerAverageRating} />
              <StatTile label="Reviews" scope="All time" metric={m.ownerReviewCount} />
            </TileRow>
          </Section>
          <Section title="Tenancy length">
            <CountBarChart series={data.series.tenancyDurationDistribution} emptyText="No accepted tenancies yet" />
          </Section>
          <ActivitySection period={period} onPeriodChange={setPeriod} loading={loading} dataPeriod={data.period}>
            <Section title="Rent recorded">
              <TileRow>
                <StatTile featured label="Rent recorded" metric={m.recordedRentPaymentTotal} />
                <StatTile label="Payments recorded" metric={m.recordedRentPaymentCount} />
              </TileRow>
            </Section>
            <Section title="Monthly rent recorded"><LineChart series={data.series.monthlyRecordedRentPayments} emptyText="No rent recorded in this period" /></Section>
            <Section title="Occupancy in period">
              <TileRow>
                <StatTile label="Avg. occupancy" metric={m.averageOccupancyRate} />
                <StatTile label="Tenants in period" metric={m.tenantsInPeriodCount} />
              </TileRow>
            </Section>
            <Section title="Occupancy trend"><LineChart series={data.series.monthlyOccupancyRate} emptyText="No occupancy in this period" maxValue={100} /></Section>
            <Section title="Rental activity">
              <MetricRow label="Offers sent in period" metric={m.offersSentCount} />
              <MetricRow label="Offers accepted in period" metric={m.offersAcceptedCount} />
              <MetricRow label="Tenancies ended" metric={m.terminationsCount} />
              <MetricRow label="Avg. days on market" metric={m.averageDaysOnMarket} />
            </Section>
          </ActivitySection>
        </> : null}
        {tab === 'Properties' ? (
          <>
            <Section title="By property" action={
              <RefreshControl onRefresh={refresh} loading={loading || listings.loading} asOf={data.asOf} />
            }>
              {listings.loading ? <Text style={styles.muted}>Loading your listings…</Text> : null}
              {listings.error ? <Text style={styles.inlineError}>{listings.error}</Text> : null}
              {!listings.loading && !listings.error && listings.items.length === 0 ? (
                <Text style={styles.muted}>You don't own any listings yet.</Text>
              ) : null}
              {listings.items.map((listing) => (
                <Pressable
                  key={listing.listingID}
                  style={styles.listingRow}
                  onPress={() => router.push({ pathname: '/ListingAnalyticsScreen', params: { listingId: listing.listingID, period } })}
                  accessibilityRole="button"
                  accessibilityLabel={`View analytics for ${listing.name}`}
                >
                  <View style={styles.listingText}>
                    <Text style={styles.listingName}>{listing.name}</Text>
                    <Text style={styles.muted}>{[listing.type, listing.location].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <FontAwesome name="chevron-right" size={14} color={COLORS.inkMuted} />
                </Pressable>
              ))}
            </Section>
          </>
        ) : null}
      </AnalyticsLayout>
    </>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', width: '100%', maxWidth: 1120, alignSelf: 'center' },
  backButton: { width: 44, height: 44, flexShrink: 0, borderRadius: 22, borderWidth: 1, borderColor: '#EAECF0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  headerTitle: { flex: 1, marginLeft: 8, fontSize: 24, fontWeight: '700', textAlign: 'left', color: '#101820' },
  loadingText: { marginTop: 14, fontSize: 16, fontWeight: '600', color: '#101820' },
  inlineError: {
    fontSize: 13,
    color: COLORS.error,
    marginBottom: 12,
  },
  muted: {
    fontSize: 13,
    color: COLORS.inkSecondary,
  },
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listingText: {
    flex: 1,
  },
  listingName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.ink,
    marginBottom: 2,
  },
});

export default OwnerAnalyticsScreen;
