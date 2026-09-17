import React, { useState } from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
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
  ShareBar,
  StatTile,
  TileRow,
  useAnalytics,
} from '../components/analytics/AnalyticsKit';

const AdminAnalyticsScreen = () => {
  const router = useRouter();
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const { data, loading, error, unauthenticated, retry } = useAnalytics(ENDPOINTS.ANALYTICS_ADMIN_SUMMARY, period);

  const header = <Stack.Screen options={{ title: 'Platform analytics' }} />;

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
      <Text style={styles.title}>Platform analytics</Text>
      <Text style={styles.subtitle}>Platform activity and safety at a glance. Tap any number to see how it's calculated.</Text>

      <PeriodSelector value={period} onChange={setPeriod} loading={loading} />

      <Section title="Overview">
        <TileRow>
          <StatTile icon="dollar" tone="orange" label="Rent recorded" metric={m.recordedRentPaymentTotal} change={m.recordedRentPaymentTotalChange} />
          <StatTile icon="credit-card" tone="magenta" label="Payments recorded" metric={m.recordedRentPaymentCount} change={m.recordedRentPaymentCountChange} />
          <StatTile icon="users" tone="blue" label="Registered users" metric={m.registeredUserCount} />
          <StatTile icon="home" tone="blue" label="Listings" metric={m.listingCount} />
        </TileRow>
      </Section>

      <Section title="Monthly rent recorded" note="Grouped by the month each payment is for, not the day it was made.">
        <LineChart series={data.series.monthlyRecordedRentPayments} emptyText="No rent recorded in this period" />
      </Section>

      <Section title="Growth in this period" note="Only counts accounts and listings created since these dates started being recorded.">
        <TileRow>
          <StatTile icon="user-plus" tone="green" label="New users" metric={m.newUserCount} change={m.newUserCountChange} />
          <StatTile icon="plus-square" tone="blue" label="New listings" metric={m.newListingCount} change={m.newListingCountChange} />
        </TileRow>
      </Section>

      <Section title="User distribution" note="Every user is counted in exactly one group, so the groups add up to all users.">
        <ShareBar series={data.series.userDistribution} emptyText="No users yet" />
      </Section>

      <Section title="Moderation and safety" note="Counts items currently flagged, not the number of reports submitted.">
        <TileRow>
          <StatTile icon="flag" tone="orange" label="Flagged listings" metric={m.flaggedListingCount} />
          <StatTile icon="user-times" tone="orange" label="Flagged users" metric={m.flaggedUserCount} />
          <StatTile icon="comment" tone="orange" label="Flagged reviews" metric={m.flaggedReviewCount} />
          <StatTile icon="ban" tone="magenta" label="Banned users" metric={m.bannedUserCount} />
        </TileRow>
        <Meter label="User ban rate" metric={m.userBanRate} />
      </Section>

      <Section title="Flagged items by type">
        <BarChart series={data.series.flaggedItemsByType} emptyText="Nothing is flagged right now" />
      </Section>

      <Section title="Rental activity in this period">
        <TileRow>
          <StatTile icon="paper-plane" tone="green" label="Offers sent" metric={m.offersSentCount} />
          <StatTile icon="check-circle" tone="violet" label="Offers accepted" metric={m.offersAcceptedCount} />
          <StatTile icon="sign-out" tone="magenta" label="Terminations" metric={m.terminationsCount} />
          <StatTile icon="calendar" tone="blue" label="Avg. days on market" metric={m.averageDaysOnMarket} />
        </TileRow>
      </Section>

      <Section title="Rentals (all time)">
        <TileRow>
          <StatTile icon="paper-plane" tone="green" label="Offers sent" metric={m.rentalRecordCount} />
          <StatTile icon="check-circle" tone="violet" label="Accepted" metric={m.acceptedRentalRecordCount} />
        </TileRow>
        <Meter label="Acceptance rate" metric={m.acceptanceRate} />
        <Meter label="Termination rate" metric={m.terminationRate} />
      </Section>

      <Section title="Not yet available">
        <TileRow>
          <StatTile icon="check-square-o" tone="green" label="Report resolution rate" metric={m.reportResolutionRate} />
        </TileRow>
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
});

export default AdminAnalyticsScreen;
