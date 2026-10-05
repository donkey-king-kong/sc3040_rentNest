import React, { useState } from 'react';
import { AdminHeader, AdminLoadingState } from '../components/AdminUI';
import { Stack, useRouter } from 'expo-router';
import AnalyticsLayout from '../components/analytics/AnalyticsLayout';
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
<AdminHeader title="Platform analytics" onBack={() => router.replace('/AdminScreen')} backLabel="Back to admin" />
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
      <AnalyticsLayout compactTabs periodAccent="#16794B"
        tabs={['Overview', 'Rentals', 'Users', 'Safety']} tab={tab} onTabChange={setTab}
        period={period} onPeriodChange={setPeriod} loading={loading} error={error} onRefresh={retry} dataPeriod={data.period} asOf={data.asOf}>
        {tab === 'Overview' ? (
          <>
            <Section title="Overview">
              <TileRow>
                <StatTile featured label="Rent recorded" metric={m.recordedRentPaymentTotal} change={m.recordedRentPaymentTotalChange} />
                <StatTile featured label="Payments recorded" metric={m.recordedRentPaymentCount} change={m.recordedRentPaymentCountChange} />
                <StatTile label="Registered users" metric={m.registeredUserCount} />
                <StatTile label="Listings" metric={m.listingCount} />
              </TileRow>
            </Section>
            <Section title="Monthly rent recorded" note="S$ by rental month">
              <LineChart series={data.series.monthlyRecordedRentPayments} emptyText="No rent recorded in this period" />
            </Section>
          </>
        ) : null}

        {tab === 'Rentals' ? (
          <>
            <Section title="Rental activity in this period">
              <TileRow>
                <StatTile label="Offers sent" metric={m.offersSentCount} />
                <StatTile label="Offers accepted" metric={m.offersAcceptedCount} />
                <StatTile label="Terminations" metric={m.terminationsCount} />
                <StatTile label="Avg. days on market" metric={m.averageDaysOnMarket} />
              </TileRow>
            </Section>
            <Section title="Rentals (all time)">
              <MetricRow label="Total recorded offers (all time)" metric={m.rentalRecordCount} />
              <DonutChart series={offerDistribution} totalLabel="Recorded offers" emptyText="No recorded offers yet" />
              <MetricRow label="Terminated / accepted (all time)" metric={m.terminationRate} />
            </Section>
          </>
        ) : null}

        {tab === 'Users' ? (
          <>
            <Section title="User distribution">
              <DonutChart series={data.series.userDistribution} emptyText="No users yet" />
            </Section>
          </>
        ) : null}

        {tab === 'Safety' ? (
          <>
            <Section title="Moderation and safety">
              <TileRow>
                <StatTile label="Flagged listings" metric={m.flaggedListingCount} />
                <StatTile label="Flagged users" metric={m.flaggedUserCount} />
                <StatTile label="Flagged reviews" metric={m.flaggedReviewCount} />
                <StatTile label="Banned users" metric={m.bannedUserCount} />
              </TileRow>
              <Meter label="Banned / all registered users" metric={m.userBanRate} />
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


export default AdminAnalyticsScreen;
