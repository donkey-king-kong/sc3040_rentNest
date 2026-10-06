import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { FontAwesome } from 'react-native-vector-icons';
import { AdminLoadingState } from '../components/AdminUI';
import { Stack, useRouter } from 'expo-router';
import AnalyticsLayout, { ActivitySection, RefreshControl } from '../components/analytics/AnalyticsLayout';
import { ENDPOINTS } from '../config/api';
import {
  DEFAULT_PERIOD,
  BarChart,
  CountBarChart,
  ErrorState,
  LineChart,
  PieChart,
  Section,
  StatTile,
  TileRow,
  useAnalytics,
} from '../components/analytics/AnalyticsKit';

const AdminAnalyticsScreen = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const { data, loading, error, unauthenticated, retry } = useAnalytics(ENDPOINTS.ANALYTICS_ADMIN_SUMMARY, period);

  const header = (
    <>
      <Stack.Screen options={{ title: 'Platform analytics' }} />
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.replace('/AdminScreen')}
          accessibilityRole="button" accessibilityLabel="Back to admin">
          <FontAwesome name="chevron-left" size={18} color="#101820" />
        </Pressable>
        <Text style={styles.headerTitle}>Platform analytics</Text>
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
  if (!data && loading) return <AdminLoadingState message="Loading analytics..." />;
  if (!data) return <>{header}<ErrorState message={error} onRetry={retry} /></>;

  const m = data.metrics;
  const participation = {
    availability: 'available', unit: 'count', basis: 'snapshot',
    definition: 'Property owners own at least one listing. Current tenants have an active tenancy covering today. Past tenants have an ended accepted tenancy and no current tenancy. Property owners may also be tenants, so these counts are independent.',
    points: [
      ['Property Owners', m.ownerUserCount],
      ['Current tenants', m.currentTenantUserCount],
      ['Past tenants', m.pastTenantUserCount],
    ].map(([bucket, metric]) => {
      const available = metric?.availability === 'available' && metric.value !== null
        && Number.isInteger(Number(metric.value)) && Number(metric.value) >= 0;
      return { bucket, availability: available ? 'available' : 'unavailable', value: available ? Number(metric.value) : null };
    }),
  };
  const reportedMetrics = [m.flaggedListingCount, m.flaggedUserCount, m.flaggedReviewCount];
  const reportCountsAvailable = reportedMetrics.every(metric => metric?.availability === 'available'
    && metric.value !== null && Number.isInteger(Number(metric.value)) && Number(metric.value) >= 0);
  const totalReported = {
    availability: reportCountsAvailable ? 'available' : 'unavailable',
    value: reportCountsAvailable ? reportedMetrics.reduce((sum, metric) => sum + Number(metric.value), 0) : null,
    unit: 'count', basis: 'snapshot',
    definition: 'Reported listings plus reported users plus reported reviews currently awaiting review. Counts reported records, not individual report submissions. Banned users are counted separately.',
    reason: reportCountsAvailable ? null : 'Reported counts are not available.',
  };
  const reportedCounts = reportCountsAvailable ? {
    availability: 'available', unit: 'count', basis: 'snapshot',
    definition: 'Current counts of reported listings, users and reviews. Each record is counted once, regardless of how many times it was reported. Clearing a report removes it from these counts; banned users are counted separately.',
    points: ['Reported listings', 'Reported users', 'Reported reviews'].map((bucket, index) => ({ bucket, value: Number(reportedMetrics[index].value) })),
  } : { availability: 'unavailable', reason: 'Reported counts are not available.' };
  const registeredUsers = m.registeredUserCount;
  const bannedUsers = m.bannedUserCount;
  const validUserCounts = [registeredUsers, bannedUsers].every(metric => metric?.availability === 'available'
    && metric.value !== null && Number.isInteger(Number(metric.value)) && Number(metric.value) >= 0)
    && Number(bannedUsers.value) <= Number(registeredUsers.value);
  const nonBannedUsers = {
    availability: validUserCounts ? 'available' : 'unavailable',
    value: validUserCounts ? Number(registeredUsers.value) - Number(bannedUsers.value) : null,
    unit: 'count',
    basis: 'snapshot',
    definition: 'Registered users who are not currently banned. Includes reported users who have not been banned. Calculated as all registered users minus banned users.',
    reason: validUserCounts ? null : 'Registered and banned user counts are not available or do not reconcile.',
  };
  const banDistribution = validUserCounts ? {
    availability: 'available',
    points: [
      { bucket: 'Allowed to sign in', value: nonBannedUsers.value },
      { bucket: 'Blocked from signing in', value: Number(bannedUsers.value) },
    ],
  } : { availability: 'unavailable', reason: 'User counts are not available.' };
  const total = m.rentalRecordCount;
  const accepted = m.acceptedRentalRecordCount;
  const terminated = m.terminatedRentalRecordCount;
  const pending = m.pendingRentalRecordCount;
  const counts = [total, accepted, terminated, pending];
  const valid = counts.every(metric => metric?.availability === 'available' && metric.value !== null && Number.isInteger(Number(metric.value)) && Number(metric.value) >= 0);
  const reconciled = valid && Number(accepted.value) >= Number(terminated.value) && Number(total.value) === Number(accepted.value) + Number(pending.value);
  const offerDistribution = reconciled ? {
    availability: 'available',
    points: [
      { bucket: 'Pending', value: Number(pending.value) },
      { bucket: 'Active', value: Number(accepted.value) - Number(terminated.value) },
      { bucket: 'Terminated', value: Number(terminated.value) },
    ],
  } : { availability: 'unavailable', reason: counts.find(metric => metric?.reason)?.reason || 'Rental status counts cannot be reconciled.' };

  return (
    <>
      {header}
      <AnalyticsLayout compactTabs showPeriod={false} showRefresh={false} periodAccent="#16794B"
        period={period} onPeriodChange={setPeriod} loading={loading} error={error} onRefresh={retry} dataPeriod={data.period} asOf={data.asOf}>
          <Section title="Overview" action={<RefreshControl onRefresh={retry} loading={loading} asOf={data.asOf} />}><TileRow>
            <StatTile label="Registered users" scope="Now" metric={m.registeredUserCount} />
            <StatTile label="Listings" scope="Now" metric={m.listingCount} />
          </TileRow><TileRow>
            <StatTile label="Total money earned" scope="All time" metric={m.lifetimeRecordedRentPaymentTotal || {
              availability: 'unavailable', unit: 'SGD', basis: 'snapshot',
              definition: 'Total recorded rent payments across all rentals. Excludes deposits and does not deduct refunds.',
              reason: 'The lifetime payment total could not be loaded.',
            }} />
            <StatTile label="Active rentals" scope="Now" metric={m.activeRentalRecordCount || {
              availability: 'unavailable', unit: 'count', basis: 'snapshot',
              reason: 'The active rental count could not be loaded.',
            }} />
          </TileRow></Section>
          <Section>
            <View style={[styles.userCharts, width < 700 && styles.userChartsStacked]}>
              <View style={[styles.userChart, width < 700 && styles.userChartStacked]}>
                <CountBarChart title="Property and tenancy activity" series={participation} showReadout={false} valueLabel="" totalMetric={registeredUsers} totalLabel="Total users" />
              </View>
              <View style={[styles.userChart, width < 700 && styles.userChartStacked]}>
                <PieChart title="User accounts" series={banDistribution} totalLabel="Registered users" emptyText="No users yet" totalMetric={registeredUsers} metricLabel="Total users" />
                <View style={styles.reportedChart}>
                  <CountBarChart title="Reported records" series={reportedCounts} showReadout={false} valueLabel="" totalMetric={totalReported} totalLabel="Total reported" scaleToTotal />
                </View>
              </View>
            </View>
          </Section>
          <Section>
            <PieChart title="Rentals" series={offerDistribution} totalLabel="Recorded offers" emptyText="No recorded offers yet" totalMetric={m.rentalRecordCount} metricLabel="Total rental offers" />
          </Section>
          <ActivitySection period={period} onPeriodChange={setPeriod} loading={loading} dataPeriod={data.period}>
            <Section title="Rent recorded"><TileRow>
              <StatTile featured label="Rent recorded" metric={m.recordedRentPaymentTotal} />
              <StatTile label="Payments recorded" metric={m.recordedRentPaymentCount} />
            </TileRow></Section>
            <Section><LineChart title="Monthly rent recorded" series={data.series.monthlyRecordedRentPayments} emptyText="No rent recorded in this period" /></Section>
            <Section title="Rental activity">
              <LineChart title="Monthly rental activity" series={data.series.monthlyOffersAccepted} hidePeriodLabel cleanHeader
                seriesLabel="Offers accepted" comparisonSeries={data.series.monthlyTerminations}
                comparisonLabel="Terminations" emptyText="No dated rental activity in this period" />
            </Section>
            <Section>
              <BarChart title="Average days on market" series={data.series.monthlyAverageDaysOnMarket} hidePeriodLabel cleanHeader
                emptyText="No accepted offers with valid dates in this period" />
            </Section>
          </ActivitySection>
      </AnalyticsLayout>
    </>
  );
};


const styles = StyleSheet.create({
  userCharts: { flexDirection: 'row', gap: 20 },
  userChartsStacked: { flexDirection: 'column' },
  userChart: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  userChartStacked: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%' },
  reportedChart: { marginTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', width: '100%', maxWidth: 1120, alignSelf: 'center' },
  backButton: { width: 44, height: 44, flexShrink: 0, borderRadius: 22, borderWidth: 1, borderColor: '#EAECF0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  headerTitle: { flex: 1, marginLeft: 8, fontSize: 24, fontWeight: '700', textAlign: 'left', color: '#101820' },
});

export default AdminAnalyticsScreen;
