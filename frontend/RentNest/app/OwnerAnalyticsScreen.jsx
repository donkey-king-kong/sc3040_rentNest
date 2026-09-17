import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from 'react-native-vector-icons';
import { ENDPOINTS } from '../config/api';
import {
  COLORS,
  BarChart,
  DEFAULT_PERIOD,
  ErrorState,
  LineChart,
  LoadingState,
  Meter,
  PeriodSelector,
  Section,
  StatTile,
  TileRow,
  useAnalytics,
  useOwnedListings,
} from '../components/analytics/AnalyticsKit';

const OwnerAnalyticsScreen = () => {
  const router = useRouter();
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const { data, loading, error, unauthenticated, retry } = useAnalytics(ENDPOINTS.ANALYTICS_OWNER_SUMMARY, period);
  const listings = useOwnedListings();

  const header = <Stack.Screen options={{ title: 'Analytics' }} />;

  if (unauthenticated) {
    return (
      <>
        {header}
        <ErrorState message={error || 'Please log in to view analytics.'} onRetry={() => router.replace('/LandingScreen')} actionLabel="Go to login" />
      </>
    );
  }
  if (!data && loading) return <>{header}<LoadingState /></>;
  if (!data) return <>{header}<ErrorState message={error} onRetry={retry} /></>;

  const m = data.metrics;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {header}
      <Text style={styles.title}>Analytics overview</Text>
      <Text style={styles.subtitle}>How your rental properties are performing. Tap any number to see how it's calculated.</Text>

      <PeriodSelector value={period} onChange={setPeriod} loading={loading} />
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}

      <Section title="Rent">
        <TileRow>
          <StatTile icon="dollar" tone="orange" label="Rent recorded" metric={m.recordedRentPaymentTotal} change={m.recordedRentPaymentTotalChange} />
          <StatTile icon="credit-card" tone="magenta" label="Payments recorded" metric={m.recordedRentPaymentCount} change={m.recordedRentPaymentCountChange} />
        </TileRow>
      </Section>

      <Section title="Monthly rent recorded" note="Grouped by the month each payment is for, not the day it was made.">
        <BarChart series={data.series.monthlyRecordedRentPayments} emptyText="No rent recorded in this period" />
      </Section>

      <Section title="Properties">
        <TileRow>
          <StatTile icon="home" tone="blue" label="Listings" metric={m.listingCount} />
          <StatTile icon="key" tone="green" label="Active tenancies" metric={m.activeTenancyCount} />
          <StatTile icon="users" tone="green" label="Tenants hosted (all time)" metric={m.tenantsHostedCount} />
          <StatTile icon="clock-o" tone="blue" label="Average tenancy" metric={m.averageTenancyMonths} />
          <StatTile icon="pie-chart" tone="violet" label="Avg. occupancy" metric={m.averageOccupancyRate} change={m.averageOccupancyRateChange} />
          <StatTile icon="user-plus" tone="green" label="Tenants in period" metric={m.tenantsInPeriodCount} change={m.tenantsInPeriodChange} />
        </TileRow>
        <Meter label="Occupancy rate right now" metric={m.occupancyRate} />
      </Section>

      <Section title="Occupancy trend" note="Share of each month your listings were occupied. Uses the listings you own now.">
        <LineChart series={data.series.monthlyOccupancyRate} emptyText="No occupancy in this period" maxValue={100} />
      </Section>

      <Section title="Activity in this period" note="Only counts events since these dates started being recorded. Tap a number for details.">
        <TileRow>
          <StatTile icon="plus-square" tone="blue" label="New listings" metric={m.newListingCount} />
          <StatTile icon="paper-plane" tone="green" label="Offers sent" metric={m.offersSentCount} change={m.offersSentChange} />
          <StatTile icon="check-circle" tone="violet" label="Offers accepted" metric={m.offersAcceptedCount} />
          <StatTile icon="sign-out" tone="magenta" label="Terminations" metric={m.terminationsCount} />
          <StatTile icon="calendar" tone="blue" label="Avg. days on market" metric={m.averageDaysOnMarket} />
        </TileRow>
      </Section>

      <Section title="Offers (all time)">
        <TileRow>
          <StatTile icon="paper-plane" tone="green" label="Offers sent" metric={m.rentalRecordCount} />
          <StatTile icon="check-circle" tone="violet" label="Accepted" metric={m.acceptedRentalRecordCount} />
          <StatTile icon="hourglass-half" tone="orange" label="Pending" metric={m.pendingRentalRecordCount} />
          <StatTile icon="times-circle" tone="magenta" label="Terminated" metric={m.terminatedRentalRecordCount} />
        </TileRow>
        <Meter label="Acceptance rate" metric={m.acceptanceRate} />
      </Section>

      <Section title="Tenancy length" note="Terminated tenancies use their termination date; active ones use the lease expiry.">
        <BarChart series={data.series.tenancyDurationDistribution} emptyText="No accepted tenancies yet" />
      </Section>

      <Section title="Reviews" note="Reviews are about you as an owner, not about a specific property.">
        <TileRow>
          <StatTile icon="star" tone="orange" label="Average rating" metric={m.ownerAverageRating} />
          <StatTile icon="comment" tone="violet" label="Reviews" metric={m.ownerReviewCount} />
        </TileRow>
      </Section>

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.ink,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.inkSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
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
