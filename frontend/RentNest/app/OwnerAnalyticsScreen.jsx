import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from 'react-native-vector-icons';
import { AdminLoadingState } from '../components/AdminUI';
import AnalyticsLayout, { ActivitySection, RefreshControl } from '../components/analytics/AnalyticsLayout';
import { displayMetric, displayChart } from '../components/analytics/AnalyticsPresentation';
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

  const totalListings = displayMetric(data.totalListings, 'count', 'All listings you own.');
  const totalRent = displayMetric(data.totalRentCollected, data.currency, 'All rent recorded for your current listings. Excludes deposits; refunds are not deducted.');
  const totalViews = displayMetric(data.totalViews, 'count', 'Visits to your current listings, including repeat visits. Excludes your own visits.', 'The total listing views could not be loaded.');
  const tenantsHosted = displayMetric(data.tenantsHosted, 'count', 'Different tenants who have accepted an offer for one of your listings.');
  const averageTenancy = displayMetric(data.averageTenancyMonths, 'months', 'Average accepted tenancy length. Active rentals use the agreed length; ended rentals use their recorded end date.', data.averageTenancyUnavailableReason);
  const terminations = displayMetric(data.terminations, 'count', 'All recorded rental terminations for listings you currently own.');
  const validListingCounts = [data.totalListings, data.occupiedListings].every(value => Number.isInteger(value) && value >= 0)
    && data.occupiedListings <= data.totalListings;
  const listingDistribution = validListingCounts ? {
    availability: 'available', unit: 'count', basis: 'snapshot',
    definition: 'Occupied listings have a tenancy covering today. Other listings are vacant.',
    points: [
      { bucket: 'Occupied Listings', value: data.occupiedListings },
      { bucket: 'Vacant Listings', value: data.totalListings - data.occupiedListings },
    ],
  } : { availability: 'unavailable', reason: 'Listing counts are not available or do not add up.' };
  const reviewCount = Number.isInteger(data.reviewCount) && data.reviewCount >= 0 ? data.reviewCount : null;
  const reviewSummary = reviewCount === null ? 'Review count not available'
    : reviewCount === 0 ? null : 'Based on ' + reviewCount.toLocaleString('en-SG') + ' ' + (reviewCount === 1 ? 'review' : 'reviews');
  const rating = displayMetric(data.averageRating, 'rating_out_of_5',
    'Your average review rating out of 5.' + (reviewSummary ? ' ' + reviewSummary + '.' : ''), data.averageRatingUnavailableReason);
  const starRating = data.averageRating != null && Number.isFinite(Number(data.averageRating))
    && Number(data.averageRating) >= 0 && Number(data.averageRating) <= 5 ? Number(data.averageRating) : null;
  const tenancyLengths = displayChart(data.tenancyLengths, 'count', 'Accepted rentals grouped by length. Active rentals use the agreed length; ended rentals use their recorded end date.', null, 'snapshot');
  const validTenancyLengths = Array.isArray(data.tenancyLengths) && data.tenancyLengths.every(point =>
    point.value !== null && Number.isInteger(Number(point.value)) && Number(point.value) >= 0);
  const totalTenancies = displayMetric(validTenancyLengths ? data.tenancyLengths.reduce((sum, point) => sum + Number(point.value), 0) : null,
    'count', 'Total tenancies included in these groups.', 'Tenancy lengths are not available.');
  const monthlyRent = displayChart(data.monthlyRent, data.currency, 'Rent grouped by the month paid for. Excludes deposits; refunds are not deducted.');
  const monthlyAcceptedOffers = displayChart(data.monthlyAcceptedOffers, 'count', 'Offers accepted each month. Offers without an acceptance date are left out.');
  const monthlyTerminations = displayChart(data.monthlyTerminations, 'count', 'Rentals terminated each month. Rentals without a termination date are left out.');
  const monthlyDaysOnMarket = displayChart(data.monthlyAverageDaysOnMarket, 'days', 'Average days from publication to first acceptance, grouped by acceptance month. Months without data are blank.');

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
              <StatTile label="Total Rent Collected" scope="All time" metric={totalRent} />
              <StatTile label="Total Views" scope="All time" metric={totalViews} />
            </TileRow>
            <TileRow>
              <StatTile label="Tenants Hosted" scope="All time" metric={tenantsHosted} />
              <StatTile label="Average Tenancy" scope="All time" metric={averageTenancy} />
            </TileRow>
            <TileRow>
              <StatTile label="Terminations" scope="All time" metric={terminations} />
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
            <PieChart title="Listing Occupancy" series={listingDistribution} totalMetric={totalListings}
              metricLabel="Total Listings" totalLabel="Listings" emptyText="No listings yet" />
          </Section>
          <ActivitySection title={null} loading={loading}>
            <Section><LineChart title="Monthly Rent Recorded" series={monthlyRent} showEveryMonth emptyText="No rent recorded in the past 12 months" /></Section>
            <Section>
              <LineChart title="Monthly Rental Activity" series={monthlyAcceptedOffers}
                seriesLabel="Offers Accepted" comparisonSeries={monthlyTerminations}
                comparisonLabel="Terminations" cleanHeader hidePeriodLabel showEveryMonth
                emptyText="No dated rental activity in the past 12 months" />
            </Section>
            <Section>
              <BarChart title="Average Days on Market" series={monthlyDaysOnMarket}
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
