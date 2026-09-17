import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useRouter } from "expo-router";
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import jwtDecode from 'jwt-decode';

const dummyTenant = {
  userID: 96,
  name: "Jacob Sartorius",
  contact: 94242718,
  photoURL: "https://media.istockphoto.com/id/1495088043/vector/user-profile-icon-avatar-or-person-icon-profile-picture-portrait-symbol-default-portrait.jpg?s=612x612&w=0&k=20&c=dhV2p1JwmloBTOaGAtaA3AW1KSnjsdMt7-U_3EZElZ0=",
}

const dummyRental = {
  ownerUserId: 38,
  leaseExpiry: "2025-01-31T00:00:00.000+00:00",
  rentalPrice: 2900,
  depositPrice: 5800,
  rentalID: 50,
};

const dummyPayments = [
  {
    date: '2023-11-01',
    amount: 2800,
  },
  {
    date: '2023-10-01',
    amount: 2800,
  }
];

const TenantOverview = () => {
  const route = useRoute();
  const router = useRouter();
  const navigation = useNavigation();
  const { tenantId, listingId } = route.params;
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [rental, setRental] = useState(null);
  const [payments, setPayments] = useState([]);
  const [outstandingPayments, setOutstandingPayments] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          navigation.navigate('LandingScreen');
          return;
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };
        try{
          const tenantResponse = await axios.get(`${API_BASE_URL}/api/users/id/${tenantId}`, { headers });
          setTenant(tenantResponse.data);
        } catch (err) {
          if (err.response && err.response.status === 404) {
            console.log(`Tenant with id : ${tenantId} not found. Returned 404, filling with dummy data.`) 
            setTenant(dummyTenant)
          }
        }

        try {
          const rentalResponse = await axios.get(
            `${API_BASE_URL}${ENDPOINTS.RENTALS}/listing/${listingId}`, // GET rental by listingID
            { headers }
          );
          setRental(rentalResponse.data);
        } catch (err) {
          if (err.response && err.response.status === 404) {
            console.log('Rental endpoint returned 404:', `${API_BASE_URL}${ENDPOINTS.RENTALS}/listing/${listingId}`);
            setRental(dummyRental);
          } else {
            throw err;
          }
        }

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
          if (err.response && err.response.status === 404) {
            console.log('Payments endpoint returned 404:', `${API_BASE_URL}${ENDPOINTS.TENANT_PAYMENTS(listingId, tenantId)}`);
            setPayments(dummyPayments);
          } else {
            throw err;
          }
        }

        try {
          const outstandingResponse = await axios.get(
            `${API_BASE_URL}${ENDPOINTS.OUTSTANDING_PAYMENTS(listingId)}`, 
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
          if (err.response && err.response.status === 404) {
            console.log('Outstanding payments endpoint returned 404:', `${API_BASE_URL}${ENDPOINTS.OUTSTANDING_PAYMENTS(listingId)}`);
            setOutstandingPayments([]);
          } else {
            throw err;
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        // Use dummy data for all in case of unexpected errors
        setRental(dummyRental);
        setPayments(dummyPayments);
        setOutstandingPayments([]);
        setLoading(false);
      }
    };

    fetchData();
  }, [listingId, tenantId]);

  const handleTerminateLease = () => {
    navigation.navigate('TerminateLease', { rentalId: rental.rentalID });
  };

  const handleLeaveReview = () => {
    navigation.navigate('LeaveReview', { ownerId: rental.ownerUserId, listingId: listingId, tenantId: tenant.userID }); // Pass any necessary parameters here
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading rental information...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tenant Overview</Text>

      {/* White outlined box for tenant overview */}
      <View style={styles.overviewBox}>
        <Image source={{ uri: tenant.photoURL || 'https://t3.ftcdn.net/jpg/02/43/12/34/360_F_243123463_zTooub557xEWABDLk0jJklDyLSGl2jrr.jpg'
          }} 
          style={styles.tenantPhoto} 
        />
        <View style={styles.overviewDetails}>
          <Text style={styles.tenantName}>{tenant.name || 'Tenant Name'}</Text>
          <Text style={styles.leaseExpiry}>Lease Expires on {rental.leaseExpiry}</Text>
          <Text style={styles.rentalPrice}>${rental.rentalPrice} monthly rent</Text>
        </View>
        <TouchableOpacity 
          onPress={()=>router.push(`/ChatsScreen2?partnerUserId=33&currentUser=42`)} 
          style={styles.chatButton}
        >
          <FontAwesome name="comment" size={24} color="black" />
        </TouchableOpacity>
      </View>

      {/* Payment History */}
      <Text style={styles.sectionTitle}>Payment History</Text>

      {/* Outstanding Payments */}
      {outstandingPayments.length > 0 ? (
        outstandingPayments.map((payment, index) => (
          <View key={`outstanding-${index}`} style={styles.paymentRow}>
            <Text style={styles.paymentDate}>{payment.month}</Text>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentAmount}>${payment.amount}</Text>
              <Text style={[styles.paymentStatus, styles.pendingStatus]}>
                <Text style={styles.smallText1}>Payment Pending</Text>
              </Text>
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
              <Text style={styles.smallText2}>Paid on {payment.date}</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
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
