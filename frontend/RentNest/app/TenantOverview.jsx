import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import MorphingInfinity from '../components/MorphingInfinity';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from "expo-router";
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import ProfileImage from '../components/ProfileImage';


const TenantOverview = () => {
  const router = useRouter();
  const { tenantId, listingId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [rental, setRental] = useState(null);
  const [payments, setPayments] = useState([]);
  const [outstandingPayments, setOutstandingPayments] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          router.replace('/LandingScreen');
          return;
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };
        const decoded = jwtDecode(token);
        const meResponse = await axios.get(`${API_BASE_URL}/api/users/${decoded.sub}`, { headers });
        setCurrentUserId(meResponse.data.userID);

        const tenantResponse = await axios.get(`${API_BASE_URL}/api/users/id/${tenantId}`, { headers });
        setTenant(tenantResponse.data);

        const rentalResponse = await axios.get(
          `${API_BASE_URL}${ENDPOINTS.RENTALS}/listing/${listingId}`,
          { headers }
        );
        setRental(rentalResponse.data);

        try {
          const paymentsResponse = await axios.get(
            `${API_BASE_URL}${ENDPOINTS.TENANT_PAYMENTS(listingId, tenantId)}`,
            { headers }
          );
          if (paymentsResponse.data && paymentsResponse.data.payments) {
            const sortedPayments = paymentsResponse.data.payments.sort((a, b) =>
              new Date(b.date) - new Date(a.date)
            );
            setPayments(sortedPayments);
          }
        } catch (err) {
          if (!err.response || err.response.status !== 404) throw err;
        }

        try {
          const outstandingResponse = await axios.get(
            `${API_BASE_URL}${ENDPOINTS.OUTSTANDING_PAYMENTS(rentalResponse.data.rentalID)}`,
            { headers }
          );
          if (outstandingResponse.data) {
            const outstandingData = typeof outstandingResponse.data === 'string'
              ? JSON.parse(outstandingResponse.data)
              : outstandingResponse.data;
            if (outstandingData['Outstanding Months']) {
              setOutstandingPayments(outstandingData['Outstanding Months']);
            }
          }
        } catch (err) {
          if (!err.response || err.response.status !== 404) throw err;
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setLoading(false);
      }
    };

    fetchData();
  }, [listingId, tenantId]);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MorphingInfinity size={86} color="#2FA84F" />
        <Text style={styles.loadingText}>Loading tenant information...</Text>
      </View>
    );
  }

  if (!tenant || !rental) {
    return (
      <View style={styles.loadingContainer}>
        <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', top: 20, left: 20 }}>
          <FontAwesome name="chevron-left" size={18} color="#000" />
        </TouchableOpacity>
        <Text style={styles.loadingText}>Failed to load tenant information.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="chevron-left" size={18} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Tenant Overview</Text>
      </View>

      {/* White outlined box for tenant overview */}
      <View style={styles.overviewBox}>
        <ProfileImage
          uri={tenant.photoURL}
          name={tenant.name}
          style={styles.tenantPhoto}
          textStyle={styles.tenantPhotoInitials}
          screen="TenantOverview"
          userId={tenant.userID}
          role="tenant"
        />
        <View style={styles.overviewDetails}>
          <Text style={styles.tenantName}>{tenant.name || 'Tenant Name'}</Text>
          <Text style={styles.leaseExpiry}>Lease expires on {formatDate(rental.leaseExpiry)}</Text>
          <Text style={styles.rentalPrice}>${rental.rentalPrice} monthly rent</Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push(`/ChatsScreen2?partnerUserId=${tenantId}&currentUser=${currentUserId}`)}
          style={styles.chatButton}
        >
          <FontAwesome name="comment" size={24} color="black" />
        </TouchableOpacity>
      </View>

      {/* Payment History */}
      <Text style={styles.sectionTitle}>Payment History</Text>

      {/* Outstanding Payments */}
      {outstandingPayments.length > 0 ? (
        [...outstandingPayments].sort((a, b) => new Date(b) - new Date(a)).map((dateStr, index) => (
          <View key={`outstanding-${index}`} style={styles.paymentRow}>
            <Text style={styles.paymentDate}>
              {new Date(dateStr).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </Text>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentAmount}>${rental.rentalPrice}</Text>
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
      {payments.map((payment, index) => (
        <View key={`paid-${index}`} style={styles.paymentRow}>
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

      {/* Terminate Lease Button */}
      <TouchableOpacity style={styles.actionButton} onPress={handleTerminateLease}>
        <FontAwesome name="ban" size={20} color="black" />
        <Text style={styles.buttonText}>Terminate Lease</Text>
        <FontAwesome name="chevron-right" size={20} color="gray" />
      </TouchableOpacity>

      {/* Leave Review Button */}
      <TouchableOpacity style={styles.actionButton} onPress={handleLeaveReview}>
        <FontAwesome name="star" size={20} color="black" />
        <Text style={styles.buttonText}>Leave Review</Text>
        <FontAwesome name="chevron-right" size={20} color="gray" />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
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
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
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
