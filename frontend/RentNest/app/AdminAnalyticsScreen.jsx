import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { FontAwesome } from 'react-native-vector-icons';
import { AdminLoadingState } from '../components/AdminUI';
import { Stack, useRouter } from 'expo-router';
import AnalyticsLayout, { ActivitySection, RefreshControl } from '../components/analytics/AnalyticsLayout';
import { ENDPOINTS } from '../config/api';
import {
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
  const { data, loading, error, unauthenticated, retry } = useAnalytics(ENDPOINTS.ANALYTICS_ADMIN_SUMMARY);

  const header = (
    <>
      <Stack.Screen options={{ title: 'Platform Analytics' }} />
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.replace('/AdminScreen')}
          accessibilityRole="button" accessibilityLabel="Back to admin">
          <FontAwesome name="chevron-left" size={18} color="#101820" />
        </Pressable>
        <Text style={styles.headerTitle}>Platform Analytics</Text>
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

  const metric = (value, definition, unit = 'count') => ({
    value: value ?? null, unit, definition,
    availability: value == null ? 'unavailable' : 'available',
  });
  const chart = (points, unit, definition) => ({
    availability: Array.isArray(points) ? 'available' : 'unavailable', unit, definition,
    points: (points || []).map(point => ({ bucket: point.label, value: point.value })),
  });
  const registeredUsers = metric(data.registeredUsers, 'All registered user accounts.');
  const totalOffers = metric(data.totalRentalOffers, 'All rental offers, including pending, ongoing, upcoming and ended rentals.');
  const participation = {
    availability: 'available', unit: 'count',
    definition: 'Current tenants rent today. Past tenants are grouped by how their latest tenancy ended, with termination taking precedence if end dates tie. Anyone renting today is excluded from both past groups. A user can also be a property owner.',
    points: [
      ['Property Owners', data.propertyOwners], ['Current Tenants', data.currentTenants],
      ['Lease Expired', data.expiredTenants], ['Tenancy Terminated', data.terminatedTenants],
    ].map(([bucket, value]) => {
      const available = Number.isInteger(value) && value >= 0;
      return { bucket, availability: available ? 'available' : 'unavailable', value: available ? value : null };
    }),
  };
  const validUserCounts = [data.registeredUsers, data.blockedUsers].every(value => Number.isInteger(value) && value >= 0)
    && data.blockedUsers <= data.registeredUsers;
  const banDistribution = validUserCounts ? {
    availability: 'available',
    definition: 'All registered users, grouped by whether they can sign in. Reported users can still sign in unless blocked.',
    points: [
      { bucket: 'Allowed to Sign In', value: data.registeredUsers - data.blockedUsers },
      { bucket: 'Blocked from Signing In', value: data.blockedUsers },
    ],
  } : { availability: 'unavailable', reason: 'User counts are not available.' };
  const rentalCategories = [
    ['Pending', data.pendingRentals], ['Active', data.activeRentals],
    ['Upcoming', data.upcomingRentals], ['Expired', data.expiredRentals],
    ['Terminated', data.terminatedRentals], ['Details Unavailable', data.unclassifiedRentals],
  ];
  const counts = [data.totalRentalOffers, ...rentalCategories.map(([, value]) => value)];
  const valid = counts.every(value => Number.isInteger(value) && value >= 0);
  const reconciled = valid && data.totalRentalOffers === rentalCategories.reduce((sum, [, value]) => sum + value, 0);
  const offerDistribution = reconciled ? {
    availability: 'available',
    definition: 'Pending offers await acceptance. Active tenancies cover today. Upcoming tenancies start later. Expired leases ended naturally. Terminated tenancies were explicitly ended. Missing or inconsistent details are shown separately.',
    points: rentalCategories.filter(([bucket, value]) => bucket !== 'Details Unavailable' || value > 0)
      .map(([bucket, value]) => ({ bucket, value })),
  } : { availability: 'unavailable', reason: 'Rental status counts cannot be reconciled.' };
  const monthlyRent = chart(data.monthlyRent, data.currency, 'Rent payments grouped by the month paid for. Deposits are excluded and refunds are not deducted.');
  const monthlyAcceptedOffers = chart(data.monthlyAcceptedOffers, 'count', 'Offers accepted each month. Offers without an acceptance date are left out.');
  const monthlyTerminations = chart(data.monthlyTerminations, 'count', 'Rentals terminated each month. Rentals without a termination date are left out.');
  const monthlyDaysOnMarket = chart(data.monthlyAverageDaysOnMarket, 'days', 'Average days from publishing a listing to its first accepted offer, grouped by acceptance month. Missing or invalid dates are left out. Months with no qualifying listings are blank.');

  return (
    <>
      {header}
      <AnalyticsLayout compactTabs error={error}>
          <Section title="Overview" action={<RefreshControl onRefresh={retry} loading={loading} asOf={data.asOf} />}>{!loading && <><TileRow>
            <StatTile label="Registered Users" scope="Now" metric={registeredUsers} />
            <StatTile label="Listings" scope="Now" metric={metric(data.totalListings, 'All listings currently on the platform.')} />
          </TileRow><TileRow>
            <StatTile label="Total Rent Collected" scope="All time" metric={metric(data.totalRentCollected, 'All recorded rent payments. Deposits are excluded and refunds are not deducted.', data.currency)} />
            <StatTile label="Active Rentals" scope="Now" metric={metric(data.activeRentals, 'Rentals with an active tenancy covering today.')} />
          </TileRow></>}</Section>
          {loading ? <View style={styles.refreshLoading} accessibilityLabel="Refreshing analytics">
            <AdminLoadingState message="Loading analytics…" backgroundColor="#FFFFFF" />
          </View> : <>
          <Section>
            <PieChart title="Rentals" series={offerDistribution} totalLabel="Recorded Offers" emptyText="No recorded offers yet" totalMetric={totalOffers} metricLabel="Total Rental Offers" />
          </Section>
          <ActivitySection title={null} loading={loading}>
            <Section><LineChart title="Monthly Rent Recorded" series={monthlyRent} showEveryMonth emptyText="No rent recorded in this period" /></Section>
            <Section>
              <LineChart title="Monthly Rental Activity" series={monthlyAcceptedOffers} hidePeriodLabel cleanHeader showEveryMonth
                seriesLabel="Offers Accepted" comparisonSeries={monthlyTerminations}
                comparisonLabel="Terminations" emptyText="No dated rental activity in this period" />
            </Section>
            <Section>
              <BarChart title="Average Days on Market" series={monthlyDaysOnMarket} hidePeriodLabel cleanHeader showEveryMonth
                emptyText="No accepted offers with valid dates in this period" />
            </Section>
          </ActivitySection>
          <Section>
            <View style={[styles.userCharts, width < 700 && styles.userChartsStacked]}>
              <View style={[styles.userChart, width < 700 && styles.userChartStacked]}>
                <CountBarChart title="Property and Tenancy Activity" series={participation} showReadout={false} valueLabel="" totalMetric={registeredUsers} totalLabel="Total Users" />
              </View>
              <View style={[styles.userChart, width < 700 && styles.userChartStacked]}>
                <PieChart title="User Accounts" series={banDistribution} totalLabel="Registered Users" emptyText="No users yet" totalMetric={registeredUsers} metricLabel="Total Users" />
              </View>
            </View>
          </Section>
          </>}
      </AnalyticsLayout>
    </>
  );
};

const styles = StyleSheet.create({
  refreshLoading: { height: 400 },
  userCharts: { flexDirection: 'row', gap: 20 },
  userChartsStacked: { flexDirection: 'column' },
  userChart: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  userChartStacked: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', width: '100%', maxWidth: 1120, alignSelf: 'center' },
  backButton: { width: 44, height: 44, flexShrink: 0, borderRadius: 22, borderWidth: 1, borderColor: '#EAECF0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  headerTitle: { flex: 1, marginLeft: 8, fontSize: 24, fontWeight: '700', textAlign: 'left', color: '#101820' },
});

export default AdminAnalyticsScreen;
