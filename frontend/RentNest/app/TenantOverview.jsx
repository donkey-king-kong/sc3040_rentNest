import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import MorphingInfinity from '../components/MorphingInfinity';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from "expo-router";
import { detailKey } from '../config/rentalDetails';
import { useRentalDetail } from '../config/useRentalDetail';
import ProfileImage from '../components/ProfileImage';


const TenantOverview = () => {
  const router = useRouter();
  const { tenantId, listingId } = useLocalSearchParams();
  const summary = useRentalDetail(detailKey('summary', listingId, tenantId));
  const rental = summary.data;
  const financial = useRentalDetail(rental ? detailKey('payments', rental.rentalID) : null,
    summary.verified, summary.updatedAt);
  const payments = financial.data?.payments || [];
  const outstandingPayments = financial.data?.outstandingMonths || [];
  const currentUserId = rental?.ownerUserId;
  const tenant = rental ? { userID: rental.tenantUserID, name: rental.tenantName, photoURL: rental.tenantPhotoURL } : null;
  const tenancyUnavailable = financial.status === 404 || financial.status === 409;
  const canAct = summary.verified && !tenancyUnavailable;

  const handleTerminateLease = () => {
    router.push({ pathname: '/TerminateLease', params: { rentalId: rental.rentalID } });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const handleLeaveReview = () => {
    router.push({
      pathname: '/LeaveReview',
      params: {
        revieweeId: tenant.userID,
        listingId,
        revieweeName: tenant.name,
        revieweeRole: 'Tenant',
        revieweePhotoURL: tenant.photoURL,
      },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={summary.loading && !!rental} onRefresh={() => summary.refresh()} />}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="chevron-left" size={18} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Tenant Overview</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh tenant information" disabled={summary.loading}
          style={styles.refreshButton} onPress={() => summary.refresh()}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      {summary.error ? <View>
        <Text accessibilityRole="alert" style={styles.errorText}>{summary.error}</Text>
        <TouchableOpacity accessibilityRole="button" disabled={summary.loading} style={styles.refreshButton}
          onPress={() => summary.refresh()}><Text style={styles.refreshText}>Retry tenant information</Text></TouchableOpacity>
      </View> : null}
      {!rental && !summary.error ? <View style={styles.loadingContainer}>
        <MorphingInfinity size={86} color="#2FA84F" />
        <Text accessibilityLiveRegion="polite" style={styles.loadingText}>Loading tenant information...</Text>
      </View> : null}
      {rental ? <>
      {summary.stale ? <Text style={styles.statusText} accessibilityLiveRegion="polite">
        Showing saved tenant details. {summary.loading ? 'Checking for updates...' : 'Refresh to confirm the current tenancy.'}
      </Text> : null}

      {/* White outlined box for tenant overview */}
      <View style={styles.overviewBox}>
        <ProfileImage
          uri={tenant.photoURL}
          name={tenant.name}
          style={styles.tenantPhoto}
          textStyle={styles.tenantPhotoInitials}
          screen="TenantOverview"
          diagnostics={false}
          userId={tenant.userID}
          role="tenant"
        />
        <View style={styles.overviewDetails}>
          <Text style={styles.tenantName}>{tenant.name || 'Tenant Name'}</Text>
          <Text style={styles.leaseExpiry}>Lease expires on {formatDate(rental.leaseExpiry)}</Text>
          <Text style={styles.rentalPrice}>${rental.rentalPrice} monthly rent</Text>
        </View>
        <TouchableOpacity 
          accessibilityRole="button"
          accessibilityLabel="Chat with tenant"
          disabled={!canAct}
          accessibilityState={{ disabled: !canAct }}
          onPress={() => router.push(`/ChatsScreen2?partnerUserId=${tenantId}&currentUser=${currentUserId}`)}
          style={styles.chatButton}
        >
          <FontAwesome name="comment" size={24} color="black" />
        </TouchableOpacity>
      </View>

      {/* Payment History */}
      <Text style={styles.sectionTitle}>Payment History</Text>
      {financial.error ? <View>
        <Text accessibilityRole="alert" style={styles.errorText}>{financial.error}</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.refreshButton} disabled={financial.loading}
          onPress={() => tenancyUnavailable ? summary.refresh() : financial.refresh()}>
          <Text style={styles.refreshText}>Retry payments</Text>
        </TouchableOpacity>
      </View> : null}
      {!financial.data && !financial.error ? <Text accessibilityLiveRegion="polite" style={styles.statusText}>
        {summary.verified || summary.loading ? 'Loading payments...' : 'Refresh tenant information to load payments.'}
      </Text> : null}
      {financial.data ? <>
      {financial.stale ? <Text accessibilityLiveRegion="polite" style={styles.statusText}>
        Showing saved payments. {financial.loading ? 'Checking for updates...' : 'Refresh before relying on these amounts.'}
      </Text> : null}

      {/* Outstanding Payments */}
      {outstandingPayments.length > 0 ? (
        [...outstandingPayments].sort((a, b) => new Date(b) - new Date(a)).map((dateStr, index) => (
          <View key={`outstanding-${index}`} style={styles.paymentRow}>
            <Text style={styles.paymentDate}>
              {new Date(dateStr).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </Text>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentAmount}>${financial.data.rentalPrice}</Text>
              <Text style={styles.smallText1}>Payment Pending</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.noPaymentsContainer}>
          <Text style={styles.noPaymentsText}>No outstanding payments</Text>
        </View>
      )}

      {/* Paid Payments */}
      {payments.map((payment) => (
        <View key={`paid-${payment.paymentID}`} style={styles.paymentRow}>
          <Text style={styles.paymentDate}>
            {new Date(payment.date).toLocaleString('default', { month: 'long', year: 'numeric' })}
          </Text>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentAmount}>${payment.amount}</Text>
            <Text style={styles.paymentStatus}>
              <Text style={styles.smallText2}>Paid on {formatDate(payment.date)}</Text>
            </Text>
          </View>
        </View>
      ))}
      </> : null}

      {/* Terminate Lease Button */}
      <TouchableOpacity accessibilityRole="button" disabled={!canAct} accessibilityState={{ disabled: !canAct }}
        style={[styles.actionButton, !canAct && styles.disabled]} onPress={handleTerminateLease}>
        <FontAwesome name="ban" size={20} color="black" />
        <Text style={styles.buttonText}>Terminate Lease</Text>
        <FontAwesome name="chevron-right" size={20} color="gray" />
      </TouchableOpacity>

      {/* Leave Review Button */}
      <TouchableOpacity accessibilityRole="button" disabled={!canAct} accessibilityState={{ disabled: !canAct }}
        style={[styles.actionButton, !canAct && styles.disabled]} onPress={handleLeaveReview}>
        <FontAwesome name="star" size={20} color="black" />
        <Text style={styles.buttonText}>Leave Review</Text>
        <FontAwesome name="chevron-right" size={20} color="gray" />
      </TouchableOpacity>
      </> : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 12,
    minHeight: 48,
    minWidth: 40,
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
  },
  refreshButton: { minHeight: 48, paddingHorizontal: 8, justifyContent: 'center' },
  refreshText: { color: '#205C43', fontSize: 14, fontWeight: '600' },
  errorText: { color: '#9B263D', fontSize: 16, lineHeight: 24 },
  statusText: { color: '#555', fontSize: 14, lineHeight: 21, marginBottom: 12 },
  disabled: { opacity: 0.5 },
  overviewBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  tenantPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 10,
  },
  tenantPhotoInitials: {
    fontSize: 22,
  },
  overviewDetails: {
    flex: 1,
  },
  tenantName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  leaseExpiry: {
    fontSize: 14,
    color: '#666',
  },
  rentalPrice: {
    fontSize: 14,
    color: '#666',
  },
  chatButton: {
    backgroundColor: '#f1f1f1',
    padding: 10,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentDate: {
    fontSize: 16,
  },
  paymentInfo: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentStatus: {
    fontSize: 12,
    color: '#28a745',
  },
  pendingStatus: {
    color: 'yellow',
  },
  smallText1: {
    fontSize: 12,
    color: 'orange',
  },
  smallText2: {
    fontSize: 12,
    color: '#666',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  buttonText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
  },
  noPaymentsContainer: {
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
  },
  noPaymentsText: {
    fontSize: 16,
    color: '#666',
  },
});

export default TenantOverview;
