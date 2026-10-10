import React, { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from 'react-native-vector-icons';
import { AdminLoadingState } from '../components/AdminUI';
import { ENDPOINTS } from '../config/api';
import AnalyticsLayout, { RefreshControl } from '../components/analytics/AnalyticsLayout';
import ListingOccupancyCalendar from '../components/analytics/ListingOccupancyCalendar';
import {
  COLORS, ErrorState, LineChart, MetricRow, Section, StatTile, TileRow,
  formatDay, formatValue, useAnalytics,
} from '../components/analytics/AnalyticsKit';

const ListingAnalyticsScreen = () => {
  const router = useRouter();
  const { listingId } = useLocalSearchParams();
  const { width, fontScale } = useWindowDimensions();
  const { data, loading, error, unauthenticated, retry } = useAnalytics(ENDPOINTS.ANALYTICS_OWNER_LISTING(listingId));
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [data?.listing?.listingPicture]);

  const header = <>
    <Stack.Screen options={{ title: 'Property Analytics' }} />
    <View style={styles.header}>
      <Pressable style={styles.backButton}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/OwnerAnalyticsScreen')}
        accessibilityRole="button" accessibilityLabel="Back to owner analytics">
        <FontAwesome name="chevron-left" size={18} color="#101820" />
      </Pressable>
      <Text style={[styles.headerTitle, width < 400 && styles.mobileHeaderTitle]}>Property Analytics</Text>
    </View>
  </>;

  if (unauthenticated) return <>{header}<ErrorState message={error || 'Please log in to view analytics.'}
    onRetry={() => router.replace('/LandingScreen')} actionLabel="Go to login" /></>;
  if (!data && loading) return <>{header}<View style={styles.initialLoading} accessibilityLabel="Loading property analytics">
    <AdminLoadingState message="Loading analytics…" backgroundColor="#FFFFFF" />
  </View></>;
  if (!data) return <>{header}<ErrorState message={error} onRetry={retry} /></>;

  const m = data.metrics;
  const listing = data.listing || {};
  const status = m.occupancyStatus?.availability === 'available' ? m.occupancyStatus.value : null;
  const statusLabel = status === 'occupied' ? 'Occupied' : status === 'vacant' ? 'Vacant' : 'Status unavailable';
  const tileStyle = width < 360 || fontScale > 1.2 ? styles.singleColumnTile : undefined;
  const publishedDate = listing.listedAt ? formatDay(listing.listedAt) : 'Not recorded';
  const acceptedDate = listing.firstAcceptedAt ? formatDay(listing.firstAcceptedAt) : 'Not recorded';
  const daysOnMarket = m.daysOnMarket || { availability: 'unavailable', unit: 'days', reason: 'Listing history is not available.' };
  const daysOnMarketLabel = daysOnMarket.availability === 'available'
    ? formatValue(daysOnMarket.value, daysOnMarket.unit) : 'Not available';

  return <>
    {header}
    <AnalyticsLayout compactTabs showHeader={false} error={error}>
      <View style={styles.listingHeader}>
        {listing.listingPicture && !imageFailed ? <Image source={{ uri: listing.listingPicture }} style={styles.image}
          accessible={false} onError={() => setImageFailed(true)} />
          : <View style={[styles.image, styles.imagePlaceholder]}><FontAwesome name="home" size={24} color={COLORS.inkMuted} /></View>}
        <View style={styles.listingText}>
          <Text style={styles.title}>{listing.name || 'Property'}</Text>
          <Text style={styles.subtitle}>{[listing.type, listing.location].filter(Boolean).join(' · ')}</Text>
          <View style={styles.statusBadge}>
            <FontAwesome name={status === 'occupied' ? 'circle' : status === 'vacant' ? 'circle-o' : 'question-circle'} size={9} color={COLORS.inkSecondary} />
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      <Section title="Overview" action={<RefreshControl onRefresh={retry} loading={loading} asOf={data.asOf} />}>
        <Text style={styles.sectionNote}>Past 12 months</Text>
        {!loading ? <>
          <TileRow>
            <StatTile label="Rent Recorded" metric={m.recordedRentPaymentTotal} style={tileStyle} />
            <StatTile label="Average Occupancy" metric={m.averageOccupancyRate} style={tileStyle} />
            <StatTile label="Listing Views" metric={m.listingViews} style={tileStyle} />
            <StatTile label="Unique Viewers" metric={m.uniqueListingViewers} style={tileStyle} />
          </TileRow>
          <MetricRow label="Payments Recorded" metric={m.recordedRentPaymentCount} />
        </> : null}
      </Section>

      {loading ? <View style={styles.refreshLoading} accessibilityLabel="Refreshing property analytics">
        <AdminLoadingState message="Loading analytics…" backgroundColor="#FFFFFF" />
      </View> : <>
        <Section>
          <LineChart title="Monthly Rent Recorded" series={data.series.monthlyRecordedRentPayments}
            showEveryMonth={width >= 600} emptyText="No rent recorded in the past 12 months" />
        </Section>
        <Section><ListingOccupancyCalendar series={data.series.monthlyOccupancy} /></Section>

        <Section title="Tenancy History">
          <Text style={styles.sectionNote}>All time</Text>
          <MetricRow label="Offers Sent" scope="All time" metric={m.rentalRecordCount} />
          <MetricRow label="Offers Accepted" scope="All time" metric={m.acceptedRentalRecordCount} />
          <MetricRow label="Acceptance Rate" scope="All time" metric={m.acceptanceRate} />
          <MetricRow label="Average Tenancy" scope="All time" metric={m.averageTenancyMonths} />
          <MetricRow label="Tenants Hosted" scope="All time" metric={m.tenantsHostedCount} />
        </Section>

        <Section title="Time to Accepted Offer">
          <Text style={styles.sectionNote}>From publication to the first accepted offer.</Text>
          <TileRow>
            <StatTile label="Days on Market" scope="Listing history" metric={daysOnMarket}
              accessibilityLabel={`Days on Market: ${daysOnMarketLabel}. Published: ${publishedDate}. First Offer Accepted: ${acceptedDate}`}>
              {daysOnMarket.availability !== 'available' && daysOnMarket.reason
                ? <Text style={styles.sectionNote}>{daysOnMarket.reason}</Text> : null}
              <View style={styles.timeline}>
                <View style={styles.timelineRow}>
                  <View style={styles.timelineTrack}><View style={styles.timelineDot} /><View style={styles.timelineLine} /></View>
                  <View style={styles.timelineText}>
                    <Text style={styles.dateLabel}>Published</Text>
                    <Text style={styles.dateValue}>{publishedDate}</Text>
                  </View>
                </View>
                <View style={styles.timelineRow}>
                  <View style={styles.timelineTrack}><View style={[styles.timelineDot, listing.firstAcceptedAt && styles.timelineDotFilled]} /></View>
                  <View style={styles.timelineText}>
                    <Text style={styles.dateLabel}>First Offer Accepted</Text>
                    <Text style={styles.dateValue}>{acceptedDate}</Text>
                  </View>
                </View>
              </View>
            </StatTile>
          </TileRow>
        </Section>
      </>}
    </AnalyticsLayout>
  </>;
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', width: '100%', maxWidth: 1120, alignSelf: 'center' },
  backButton: { width: 44, height: 44, flexShrink: 0, borderRadius: 22, borderWidth: 1, borderColor: '#EAECF0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  headerTitle: { flex: 1, marginLeft: 8, fontSize: 24, fontWeight: '700', color: '#101820' },
  mobileHeaderTitle: { fontSize: 22 },
  initialLoading: { flex: 1 },
  refreshLoading: { height: 320 },
  listingHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 28 },
  image: { width: 64, height: 64, borderRadius: 8, backgroundColor: COLORS.card },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  listingText: { flex: 1, minWidth: 0 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '600', color: COLORS.ink },
  subtitle: { fontSize: 14, lineHeight: 20, color: COLORS.inkSecondary, marginTop: 3 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, marginTop: 8 },
  statusText: { fontSize: 13, lineHeight: 18, fontWeight: '500', color: COLORS.inkSecondary },
  sectionNote: { fontSize: 13, lineHeight: 19, color: COLORS.inkSecondary, marginBottom: 8 },
  singleColumnTile: { flexBasis: '95%' },
  timeline: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 18, marginTop: 18 },
  timelineRow: { flexDirection: 'row' },
  timelineTrack: { width: 22, alignItems: 'center' },
  timelineDot: { width: 9, height: 9, marginTop: 5, borderRadius: 5, borderWidth: 1.5, borderColor: COLORS.inkSecondary, backgroundColor: COLORS.surface },
  timelineDotFilled: { backgroundColor: COLORS.inkSecondary },
  timelineLine: { flex: 1, width: 1, backgroundColor: COLORS.border, marginTop: 3, marginBottom: -2 },
  timelineText: { flex: 1, paddingLeft: 8, paddingBottom: 18 },
  dateLabel: { fontSize: 13, lineHeight: 19, color: COLORS.inkSecondary },
  dateValue: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: COLORS.ink, marginTop: 3 },
});

export default ListingAnalyticsScreen;
