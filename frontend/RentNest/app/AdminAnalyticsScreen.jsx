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
  const totalOffers = Number(m.rentalRecordCount?.value);
  const acceptedOffers = Number(m.acceptedRentalRecordCount?.value);
  const offersAvailable = m.rentalRecordCount?.availability === 'available'
    && m.acceptedRentalRecordCount?.availability === 'available'
    && Number.isFinite(totalOffers) && Number.isFinite(acceptedOffers)
    && totalOffers >= 0 && acceptedOffers >= 0 && acceptedOffers <= totalOffers;
  const offerDistribution = offersAvailable ? {
    availability: 'available',
    points: [
      { bucket: 'Accepted', value: acceptedOffers },
      { bucket: 'Remaining', value: totalOffers - acceptedOffers },
    ],
  } : {
    availability: 'unavailable',
    reason: m.rentalRecordCount?.reason || m.acceptedRentalRecordCount?.reason || 'Offer counts are unavailable.',
  };

  return (
    <>
      {header}
      <AnalyticsLayout compactTabs periodAccent="#16794B"
        tabs={['Overview', 'Rentals', 'Users', 'Safety']} tab={tab} onTabChange={setTab}
        period={period} onPeriodChange={setPeriod} loading={loading} error={error}>
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
            <Section title="Monthly rent recorded" note="By rental month, rather than payment date.">
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
            <Section title="Rentals (all time)" note="Accepted includes active and terminated rentals.">
              <DonutChart series={offerDistribution} totalLabel="Recorded offers" emptyText="No recorded offers yet" />
              <MetricRow label="Termination rate" metric={m.terminationRate} />
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
            <Section title="Moderation and safety" note="Counts items currently flagged, not the number of reports submitted.">
              <TileRow>
                <StatTile label="Flagged listings" metric={m.flaggedListingCount} />
                <StatTile label="Flagged users" metric={m.flaggedUserCount} />
                <StatTile label="Flagged reviews" metric={m.flaggedReviewCount} />
                <StatTile label="Banned users" metric={m.bannedUserCount} />
              </TileRow>
              <Meter label="User ban rate" metric={m.userBanRate} />
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
