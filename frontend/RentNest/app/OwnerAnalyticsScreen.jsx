import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from 'react-native-vector-icons';
import AnalyticsLayout from '../components/analytics/AnalyticsLayout';
import { ENDPOINTS } from '../config/api';
import {
  COLORS,
  BarChart,
  DEFAULT_PERIOD,
  ErrorState,
  LineChart,
  LoadingState,
  Meter,
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
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const { data, loading, error, unauthenticated, retry } = useAnalytics(ENDPOINTS.ANALYTICS_OWNER_SUMMARY, period);
  const listings = useOwnedListings();

  const header = (
    <>
      <Stack.Screen options={{ title: 'Analytics' }} />
      <View style={styles.header}>
        <Pressable style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/ProfileScreen')}
          accessibilityRole="button" accessibilityLabel="Back to profile">
          <FontAwesome name="chevron-left" size={18} color="#101820" />
        </Pressable>
        <Text style={styles.headerTitle}>Analytics overview</Text>
        <View style={styles.headerSpacer} />
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

  return (
    <>
      {header}
      <AnalyticsLayout compactTabs periodAccent="#16794B" periodBelowTabs showPeriod={tab !== 'Properties'}
        tabs={['Overview', 'Occupancy', 'Properties']} tab={tab} onTabChange={setTab}
        period={period} onPeriodChange={setPeriod} loading={loading} error={error}>
        {tab === 'Overview' ? (
          <>
            <Section title="At a glance">
              <TileRow>
                <StatTile featured label="Rent recorded" metric={m.recordedRentPaymentTotal} change={m.recordedRentPaymentTotalChange} />
                <StatTile featured label="Listings" metric={m.listingCount} />
                <StatTile label="Active tenancies" metric={m.activeTenancyCount} />
                <StatTile label="Avg. days on market" metric={m.averageDaysOnMarket} />
              </TileRow>
            </Section>
            <Section title="Monthly rent recorded" note="By rental month, rather than payment date.">
              <MetricRow label="Payments recorded" metric={m.recordedRentPaymentCount} change={m.recordedRentPaymentCountChange} />
              <LineChart series={data.series.monthlyRecordedRentPayments} emptyText="No rent recorded in this period" />
            </Section>
          <Section title="Offers">
            <MetricRow label="Offers received" metric={m.offersSentCount} change={m.offersSentChange} />
            <MetricRow label="Offers accepted" metric={m.offersAcceptedCount} />
            <MetricRow label="Tenancies ended" metric={m.terminationsCount} />
          </Section>
            <Section title="Reviews" note="Reviews are about you as an owner, not about a specific property.">
              <TileRow>
                <StatTile label="Average rating" metric={m.ownerAverageRating} />
                <StatTile label="Reviews" metric={m.ownerReviewCount} />
              </TileRow>
            </Section>
          </>
        ) : null}


        {tab === 'Occupancy' ? (
          <>
            <Section title="Occupancy and tenants">
              <TileRow>
                <StatTile label="Listings" metric={m.listingCount} />
                <StatTile label="Active tenancies" metric={m.activeTenancyCount} />
                <StatTile label="Tenants hosted (all time)" metric={m.tenantsHostedCount} />
                <StatTile label="Average tenancy" metric={m.averageTenancyMonths} />
                <StatTile label="Avg. occupancy" metric={m.averageOccupancyRate} change={m.averageOccupancyRateChange} />
                <StatTile label="Tenants in period" metric={m.tenantsInPeriodCount} change={m.tenantsInPeriodChange} />
              </TileRow>
              <Meter label="Occupancy rate right now" metric={m.occupancyRate} />
            </Section>
            <Section title="Occupancy trend" note="Share of each month your listings were occupied. Uses the listings you own now.">
              <LineChart series={data.series.monthlyOccupancyRate} emptyText="No occupancy in this period" maxValue={100} />
            </Section>
            <Section title="Tenancy length" note="Terminated tenancies use their termination date; active ones use the lease expiry.">
              <BarChart series={data.series.tenancyDurationDistribution} emptyText="No accepted tenancies yet" />
            </Section>
          </>
        ) : null}


        {tab === 'Properties' ? (
          <>
            <Section title="By property">
              {listings.loading ? <Text style={styles.muted}>Loading your listings…</Text> : null}
              {listings.error ? <Text style={styles.inlineError}>{listings.error}</Text> : null}
              {!listings.loading && !listings.error && listings.items.length === 0 ? (
                <Text style={styles.muted}>You don't own any listings yet.</Text>
              ) : null}
              {listings.items.map((listing) => (
                <Pressable
                  key={listing.listingID}
                  style={styles.listingRow}
                  onPress={() => router.push({ pathname: '/ListingAnalyticsScreen', params: { listingId: listing.listingID } })}
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
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  headerTitle: { flex: 1, fontSize: 24, fontWeight: '700', textAlign: 'center', color: '#101820' },
  headerSpacer: { width: 44 },
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
