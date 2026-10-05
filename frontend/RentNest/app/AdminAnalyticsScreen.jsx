import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FontAwesome } from 'react-native-vector-icons';
import { AdminLoadingState } from '../components/AdminUI';
import { Stack, useRouter } from 'expo-router';
import AnalyticsLayout, { ActivitySection, RefreshControl } from '../components/analytics/AnalyticsLayout';
import { ENDPOINTS } from '../config/api';
import {
  DEFAULT_PERIOD,
  ErrorState,
  LineChart,
  Meter,
  Section,
  DonutChart,
  MetricRow,
  StatTile,
  TileRow,
  useAnalytics,
} from '../components/analytics/AnalyticsKit';

const AdminAnalyticsScreen = () => {
  const router = useRouter();
  const [tab, setTab] = useState('Overview');
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
  const userDistribution = data.series.userDistribution;
  const displayedUserDistribution = userDistribution ? {
    ...userDistribution,
    points: (userDistribution.points || []).filter(point => ['Owners only', 'Tenants only'].includes(point.bucket)),
  } : userDistribution;
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
      <AnalyticsLayout compactTabs showPeriod={false} showRefresh={tab === 'Safety'} periodAccent="#16794B"
        tabs={['Overview', 'Safety']} tab={tab} onTabChange={setTab}
        period={period} onPeriodChange={setPeriod} loading={loading} error={error} onRefresh={retry} dataPeriod={data.period} asOf={data.asOf}>
        {tab === 'Overview' ? <>
          <Section title="Overview" action={<RefreshControl onRefresh={retry} loading={loading} asOf={data.asOf} />}><TileRow>
            <StatTile label="Registered users" scope="Now" metric={m.registeredUserCount} />
            <StatTile label="Listings" scope="Now" metric={m.listingCount} />
          </TileRow></Section>
          <Section title="User distribution"><DonutChart series={displayedUserDistribution} totalLabel="Owners / tenants only" emptyText="No owners-only or tenants-only accounts" /></Section>
          <Section title="Rentals (all time)">
            <MetricRow label="Total recorded offers" scope="All time" metric={m.rentalRecordCount} />
            <DonutChart series={offerDistribution} totalLabel="Recorded offers" emptyText="No recorded offers yet" />
            <MetricRow label="Terminated / accepted" scope="All time" metric={m.terminationRate} />
          </Section>
          <ActivitySection period={period} onPeriodChange={setPeriod} loading={loading} dataPeriod={data.period}>
            <Section title="Rent recorded"><TileRow>
              <StatTile featured label="Rent recorded" metric={m.recordedRentPaymentTotal} />
              <StatTile label="Payments recorded" metric={m.recordedRentPaymentCount} />
            </TileRow></Section>
            <Section title="Monthly rent recorded"><LineChart series={data.series.monthlyRecordedRentPayments} emptyText="No rent recorded in this period" /></Section>
            <Section title="Rental activity">
            <TileRow>
              <StatTile label="Offers sent" metric={m.offersSentCount} />
              <StatTile label="Offers accepted" metric={m.offersAcceptedCount} />
              <StatTile label="Terminations" metric={m.terminationsCount} />
              <StatTile label="Avg. days on market" metric={m.averageDaysOnMarket} />
            </TileRow>
            </Section>
          </ActivitySection>
        </> : null}
        {tab === 'Safety' ? (
          <>
            <Section title="Moderation and safety">
              <TileRow>
                <StatTile label="Flagged listings" scope="Now" metric={m.flaggedListingCount} />
                <StatTile label="Flagged users" scope="Now" metric={m.flaggedUserCount} />
                <StatTile label="Flagged reviews" scope="Now" metric={m.flaggedReviewCount} />
                <StatTile label="Banned users" scope="Now" metric={m.bannedUserCount} />
              </TileRow>
              <Meter label="Banned / all users" scope="Now" metric={m.userBanRate} />
            </Section>
            <Section title="Flagged items by type">
              <DonutChart series={data.series.flaggedItemsByType} totalLabel="Flagged items" emptyText="Nothing is flagged right now" />
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
});

export default AdminAnalyticsScreen;
