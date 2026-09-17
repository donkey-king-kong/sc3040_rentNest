import React, { useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, Modal, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from 'react-native-vector-icons';
import { ENDPOINTS } from '../config/api';
import {
  COLORS,
  BarChart,
  DEFAULT_PERIOD,
  ErrorState,
  LoadingState,
  Meter,
  OccupancyStrip,
  PeriodSelector,
  Section,
  StatTile,
  TileRow,
  formatValue,
  useAnalytics,
  useOwnedListings,
} from '../components/analytics/AnalyticsKit';

const TABS = ['Overview', 'Offers', 'Payments', 'Occupancy'];

const ListingAnalyticsScreen = () => {
  const router = useRouter();
  const { listingId } = useLocalSearchParams();
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [tab, setTab] = useState(TABS[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const ownedListings = useOwnedListings();
  const { data, loading, error, unauthenticated, retry } = useAnalytics(ENDPOINTS.ANALYTICS_OWNER_LISTING(listingId), period);

  const header = <Stack.Screen options={{ title: 'Property analytics' }} />;

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
  const listing = data.listing || {};
  const occupied = m.occupancyStatus?.value === 'occupied';

  const switchProperty = (id) => {
    setPickerOpen(false);
    router.setParams({ listingId: String(id) });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {header}

      <View style={styles.listingHeader}>
        {listing.listingPicture ? <Image source={{ uri: listing.listingPicture }} style={styles.image} /> : null}
        <View style={styles.listingText}>
          <Text style={styles.title}>{listing.name}</Text>
          <Text style={styles.subtitle}>{[listing.type, listing.location].filter(Boolean).join(' · ')}</Text>
          <View style={[styles.statusBadge, occupied ? styles.badgeOccupied : styles.badgeVacant]}>
            <Text style={[styles.statusText, occupied && styles.statusTextOccupied]}>
              {formatValue(m.occupancyStatus?.value, 'status')}
            </Text>
          </View>
        </View>
      </View>

      {ownedListings.items.length > 1 ? (
        <Pressable
          style={styles.changeProperty}
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Change property"
        >
          <Text style={styles.changePropertyText}>Change property</Text>
          <FontAwesome name="chevron-down" size={12} color={COLORS.ink} />
        </Pressable>
      ) : null}

      <PeriodSelector value={period} onChange={setPeriod} loading={loading} />

      <View style={styles.tabBar}>
        {TABS.map((name) => {
          const selected = name === tab;
          return (
            <Pressable
              key={name}
              style={[styles.tab, selected && styles.tabSelected]}
              onPress={() => setTab(name)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`${name} tab`}
            >
              <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{name}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'Overview' ? (
        <>
          <Section title="At a glance">
            <TileRow>
              <StatTile icon="dollar" tone="orange" label="Rent recorded" metric={m.recordedRentPaymentTotal} change={m.recordedRentPaymentTotalChange} />
              <StatTile icon="credit-card" tone="magenta" label="Payments recorded" metric={m.recordedRentPaymentCount} change={m.recordedRentPaymentCountChange} />
              <StatTile icon="pie-chart" tone="violet" label="Occupancy in period" metric={m.averageOccupancyRate} change={m.averageOccupancyRateChange} />
              <StatTile icon="calendar" tone="blue" label="Days on market" metric={m.daysOnMarket} />
              <StatTile icon="clock-o" tone="blue" label="Average tenancy" metric={m.averageTenancyMonths} />
              <StatTile icon="eye" tone="blue" label="Listing views" metric={m.listingViews} />
            </TileRow>
          </Section>
        </>
      ) : null}

      {tab === 'Offers' ? (
        <>
          <Section title="Activity in this period" note="Only counts events since these dates started being recorded.">
            <TileRow>
              <StatTile icon="paper-plane" tone="green" label="Offers sent" metric={m.offersSentCount} />
              <StatTile icon="check-circle" tone="violet" label="Offers accepted" metric={m.offersAcceptedCount} />
            </TileRow>
          </Section>
          <Section title="Offers and tenancies (all time)">
            <TileRow>
              <StatTile icon="paper-plane" tone="green" label="Offers sent" metric={m.rentalRecordCount} />
              <StatTile icon="check-circle" tone="violet" label="Accepted" metric={m.acceptedRentalRecordCount} />
              <StatTile icon="users" tone="green" label="Tenants hosted" metric={m.tenantsHostedCount} />
            </TileRow>
            <Meter label="Acceptance rate" metric={m.acceptanceRate} />
          </Section>
        </>
      ) : null}

      {tab === 'Payments' ? (
        <>
          <Section title="Rent">
            <TileRow>
              <StatTile icon="dollar" tone="orange" label="Rent recorded" metric={m.recordedRentPaymentTotal} change={m.recordedRentPaymentTotalChange} />
              <StatTile icon="credit-card" tone="magenta" label="Payments recorded" metric={m.recordedRentPaymentCount} change={m.recordedRentPaymentCountChange} />
            </TileRow>
          </Section>
          <Section title="Monthly rent recorded" note="Grouped by the month each payment is for, not the day it was made.">
            <BarChart series={data.series.monthlyRecordedRentPayments} emptyText="No rent recorded in this period" />
          </Section>
        </>
      ) : null}

      {tab === 'Occupancy' ? (
        <>
          <Section title="Occupancy">
            <TileRow>
              <StatTile icon="pie-chart" tone="violet" label="Occupancy in period" metric={m.averageOccupancyRate} change={m.averageOccupancyRateChange} />
              <StatTile icon="clock-o" tone="blue" label="Average tenancy" metric={m.averageTenancyMonths} />
            </TileRow>
          </Section>
          <Section title="Month by month" note="A month counts as occupied when an accepted tenancy covers any part of it.">
            <OccupancyStrip series={data.series.monthlyOccupancy} />
          </Section>
        </>
      ) : null}

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)} accessibilityLabel="Close">
          {/* Taps inside the sheet must not reach the backdrop, which closes it */}
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>Change property</Text>
            <ScrollView>
              {ownedListings.items.map((item) => {
                const current = String(item.listingID) === String(listingId);
                return (
                  <Pressable
                    key={item.listingID}
                    style={styles.modalRow}
                    onPress={() => switchProperty(item.listingID)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: current }}
                  >
                    <View style={styles.listingText}>
                      <Text style={[styles.modalRowName, current && styles.modalRowCurrent]}>{item.name}</Text>
                      <Text style={styles.modalRowDetail}>{[item.type, item.location].filter(Boolean).join(' · ')}</Text>
                    </View>
                    {current ? <FontAwesome name="check" size={14} color={COLORS.ink} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: COLORS.card,
  },
  listingText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.ink,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.inkSecondary,
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeOccupied: {
    backgroundColor: COLORS.series,
    borderColor: COLORS.series,
  },
  badgeVacant: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.vacantBorder,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink,
  },
  statusTextOccupied: {
    color: COLORS.surface,
  },
  changeProperty: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  changePropertyText: {
    fontSize: 14,
    color: COLORS.ink,
    marginRight: 8,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabSelected: {
    borderBottomColor: COLORS.ink,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.inkSecondary,
  },
  tabTextSelected: {
    color: COLORS.ink,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.ink,
    marginBottom: 8,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalRowName: {
    fontSize: 16,
    color: COLORS.ink,
  },
  modalRowCurrent: {
    fontWeight: '600',
  },
  modalRowDetail: {
    fontSize: 13,
    color: COLORS.inkSecondary,
    marginTop: 2,
  },
});

export default ListingAnalyticsScreen;
