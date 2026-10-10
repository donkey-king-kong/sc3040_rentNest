import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from 'react-native-vector-icons';
import { AdminLoadingState } from '../components/AdminUI';
import AnalyticsLayout, { ActivitySection, RefreshControl } from '../components/analytics/AnalyticsLayout';
import { ENDPOINTS } from '../config/api';
import {
  COLORS,
  BarChart,
  CountBarChart,
  ErrorState,
  LineChart,
  PieChart,
  Section,
  StatTile,
  TileRow,
  useAnalytics,
  useOwnedListings,
} from '../components/analytics/AnalyticsKit';

const OwnerAnalyticsScreen = () => {
  const router = useRouter();
  const [tab, setTab] = useState('Overview');
  const { data, loading, error, unauthenticated, retry } = useAnalytics(ENDPOINTS.ANALYTICS_OWNER_SUMMARY);
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
  if (!data && loading) return <AdminLoadingState message="Loading analytics…" />;
  if (!data) return <>{header}<ErrorState message={error} onRetry={retry} /></>;

  const explanations = {
    listingCount: 'All listings you own.',
    activeTenancyCount: 'Your listings with a tenancy covering today.',
    tenantsHostedCount: 'Different tenants who have accepted an offer for one of your listings.',
    averageTenancyMonths: 'Average tenancy length in months. Active rentals use the agreed lease length. Ended rentals use their recorded end date.',
    recordedRentPaymentTotal: 'Rent payments for the past 12 months, based on the month paid for. Deposits are excluded and refunds are not deducted.',
    terminationsCount: 'Rentals terminated in the past 12 months. Rentals without a termination date are left out.',
  };
  const m = Object.fromEntries(Object.entries(data.metrics).map(([key, metric]) => [key,
    explanations[key] ? { ...metric, definition: explanations[key] } : metric]));
  const series = {
    ...data.series,
    tenancyDurationDistribution: { ...data.series.tenancyDurationDistribution,
      definition: 'Accepted rentals grouped by tenancy length. Active rentals use the agreed lease length. Ended rentals use their recorded end date.' },
    monthlyRecordedRentPayments: { ...data.series.monthlyRecordedRentPayments,
      definition: 'Rent payments grouped by the month paid for over the past 12 months. Deposits are excluded and refunds are not deducted.' },
    monthlyOccupancyRate: { ...data.series.monthlyOccupancyRate,
      definition: 'The share of time your listings were occupied each month, using the listings you currently own. Only time within the past 12 months is included.' },
  };
  const vacantListings = m.listingCount?.availability === 'available' && m.activeTenancyCount?.availability === 'available' && m.listingCount.value >= m.activeTenancyCount.value
    ? { ...m.listingCount, value: m.listingCount.value - m.activeTenancyCount.value, definition: 'Your listings without a tenancy covering today.' }
    : { availability: 'unavailable', unit: 'count', reason: 'Current listing counts cannot be reconciled.' };
  const validListingCounts = [m.listingCount, m.activeTenancyCount, vacantListings].every(metric =>
    metric?.availability === 'available' && metric.value !== null
    && Number.isInteger(Number(metric.value)) && Number(metric.value) >= 0);
  const listingDistribution = validListingCounts ? {
    availability: 'available', unit: 'count', basis: 'snapshot',
    definition: 'All your listings, grouped by whether a tenancy covers today. Occupancy rate is the percentage occupied today.',
    points: [
      { bucket: 'Occupied Listings', value: Number(m.activeTenancyCount.value) },
      { bucket: 'Vacant Listings', value: Number(vacantListings.value) },
    ],
  } : { availability: 'unavailable', reason: 'Listing counts are not available or do not add up.' };
  const reviewCount = m.ownerReviewCount?.availability === 'available'
    && m.ownerReviewCount.value !== null && Number.isInteger(Number(m.ownerReviewCount.value))
    && Number(m.ownerReviewCount.value) >= 0 ? Number(m.ownerReviewCount.value) : null;
  const reviewSummary = reviewCount === null ? 'Review count not available'
    : reviewCount === 0 ? null : `Based on ${reviewCount.toLocaleString('en-SG')} ${reviewCount === 1 ? 'review' : 'reviews'}`;
  const rating = m.ownerAverageRating ? { ...m.ownerAverageRating,
    definition: `Your average review rating out of 5.${reviewSummary ? ' ' + reviewSummary + '.' : ''}` } : null;
  const starRating = rating?.availability === 'available' && rating.value !== null
    && Number.isFinite(Number(rating.value)) && Number(rating.value) >= 0 && Number(rating.value) <= 5
    ? Number(rating.value) : null;
  const tenancyLengths = series.tenancyDurationDistribution;
  const validTenancyLengths = tenancyLengths?.availability === 'available'
    && Array.isArray(tenancyLengths.points) && tenancyLengths.points.every(point =>
      point.value !== null && Number.isInteger(Number(point.value)) && Number(point.value) >= 0);
  const totalTenancies = {
    availability: validTenancyLengths ? 'available' : 'unavailable',
    value: validTenancyLengths ? tenancyLengths.points.reduce((sum, point) => sum + Number(point.value), 0) : null,
    unit: 'count', basis: 'snapshot',
    definition: 'Accepted tenancies included in the length groups. Tenancies with missing or invalid start and end dates are left out.',
    reason: validTenancyLengths ? null : 'Tenancy lengths are not available.',
  };

  return (
    <>
      {header}
      <AnalyticsLayout compactTabs
        tabs={['Overview', 'Properties']} tab={tab} onTabChange={setTab} error={error}>
        {tab === 'Overview' ? <>
          <Section title="Overview" action={
            <RefreshControl onRefresh={refresh} loading={loading} asOf={data.asOf} />
          }>
            {!loading && <>
            <TileRow>
              <StatTile label="Total Rent Collected" metric={m.recordedRentPaymentTotal} />
              <StatTile label="Total Views" scope="All time" metric={m.totalListingViews || {
                availability: 'unavailable', unit: 'count', basis: 'snapshot',
                reason: 'The total listing views could not be loaded.',
              }} />
            </TileRow>
            <TileRow>
              <StatTile label="Tenants Hosted" scope="All time" metric={m.tenantsHostedCount} />
              <StatTile label="Average Tenancy" scope="All time" metric={m.averageTenancyMonths} />
            </TileRow>
            <TileRow>
              <StatTile label="Terminations" metric={m.terminationsCount} />
              <StatTile label="Rating and Reviews" scope="All time" metric={rating}
                supportingText={reviewSummary} unavailableText={reviewCount === 0 ? 'No reviews yet' : 'Not available'}>
                {starRating !== null ? <View style={styles.ratingStars} accessible accessibilityLabel={`${starRating} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, index) => <View key={index} style={styles.ratingStar}>
                    <FontAwesome name="star" size={20} color={COLORS.border} accessible={false} />
                    <View style={[styles.ratingStarFill, { width: `${Math.min(1, Math.max(0, starRating - index)) * 100}%` }]}>
                      <FontAwesome name="star" size={20} color="#B77900" accessible={false} />
                    </View>
                  </View>)}
                </View> : null}
              </StatTile>
            </TileRow>
            </>}
          </Section>
          {loading ? <View style={styles.refreshLoading} accessibilityLabel="Refreshing analytics">
            <AdminLoadingState message="Loading analytics…" backgroundColor="#FFFFFF" />
          </View> : <>
          <Section>
            <PieChart title="Listing Occupancy" series={listingDistribution} totalMetric={m.listingCount}
              metricLabel="Total Listings" totalLabel="Listings" emptyText="No listings yet" />
          </Section>
          <ActivitySection title={null} loading={loading}>
            <Section><LineChart title="Monthly Rent Recorded" series={series.monthlyRecordedRentPayments} showEveryMonth emptyText="No rent recorded in the past 12 months" /></Section>
            <Section><LineChart title="Monthly Occupancy" series={series.monthlyOccupancyRate} showEveryMonth emptyText="No occupancy in the past 12 months" maxValue={100} /></Section>
            <Section>
              <LineChart title="Monthly Rental Activity" series={series.monthlyOffersAccepted}
                seriesLabel="Offers Accepted" comparisonSeries={series.monthlyTerminations}
                comparisonLabel="Terminations" cleanHeader hidePeriodLabel showEveryMonth
                emptyText="No dated rental activity in the past 12 months" />
            </Section>
            <Section>
              <BarChart title="Average Days on Market" series={series.monthlyAverageDaysOnMarket}
                cleanHeader hidePeriodLabel showEveryMonth emptyText="No accepted offers with valid dates in the past 12 months" />
            </Section>
          </ActivitySection>
          <Section>
            <CountBarChart title="Tenancy Length" series={tenancyLengths} totalMetric={totalTenancies}
              totalLabel="Total Tenancies" showReadout={false} emptyText="No accepted tenancies yet" />
          </Section>
          </>}
        </> : null}
        {tab === 'Properties' ? (
          <>
            <Section title="By Property" action={
              <RefreshControl onRefresh={refresh} loading={loading || listings.loading} asOf={data.asOf} />
            }>
              {loading || listings.loading ? <View style={styles.refreshLoading} accessibilityLabel="Refreshing property analytics">
                <AdminLoadingState message="Loading analytics…" backgroundColor="#FFFFFF" />
              </View> : null}
              {!loading && listings.error ? <Text style={styles.inlineError}>{listings.error}</Text> : null}
              {!loading && !listings.loading && !listings.error && listings.items.length === 0 ? (
                <Text style={styles.muted}>You don't own any listings yet.</Text>
              ) : null}
              {!loading && !listings.loading && listings.items.map((listing) => (
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
  ratingStars: { flexDirection: 'row', gap: 4, marginTop: 8, marginBottom: 4 },
  ratingStar: { width: 20, height: 22 },
  ratingStarFill: { position: 'absolute', top: 0, left: 0, height: 22, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', width: '100%', maxWidth: 1120, alignSelf: 'center' },
  backButton: { width: 44, height: 44, flexShrink: 0, borderRadius: 22, borderWidth: 1, borderColor: '#EAECF0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  headerTitle: { flex: 1, marginLeft: 8, fontSize: 24, fontWeight: '700', textAlign: 'left', color: '#101820' },
  refreshLoading: { height: 400 },
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
