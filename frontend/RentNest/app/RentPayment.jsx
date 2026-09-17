import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {useNavigation, useRoute} from "@react-navigation/native";
import {useLocalSearchParams} from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import {API_BASE_URL} from "../config/api";
import {ActivityIndicator} from "react-native"; // Assuming you're using Expo for vector icons


// Rent Payment Screen
const RentPaymentScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { listingId , tenantId } = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const { refresh } = useLocalSearchParams();
  const [paymentHistory, setPaymentHistory] = useState(null); // State to store listing data
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPaymentSuccessful, setIsPaymentSuccessful] = useState(false);
  const [loading, setLoading] = useState(true); // New loading state
  const [rentalID, setRentalID] = useState(null);
  const [amt, setAmount] = useState(null);


// localhost:8080/api/payment/monthlyPayment
  // Fetch listing details
  const getPaymentHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found!');
        navigation.replace('/LoginScreen');
        return;
      }
      console.log(`Fetching payment history for listing ID: ${listingId}, tenant ID: ${tenantId}`);
      const response = await axios.get(`${API_BASE_URL}/api/payment/tenant-payments/${listingId}/${tenantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });
      const rentalID = response.data.payments.length > 0 ? response.data.payments[0].rentalID : null;
      setRentalID(rentalID);
      const amt = response.data.payments.length > 0 ? response.data.payments[0].amount : 0; // Default to 0
      setAmount(amt);
      console.log("Payments response", response.status, response.data);
      setPaymentHistory(response.data);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  };


  const getOutstandingMonths = () => {
    if (!paymentHistory || !paymentHistory.payments.length) return [];

    // Get the latest payment date
    const lastPaymentDate = new Date(Math.max(...paymentHistory.payments.map(payment => new Date(payment.date))));
    const currentDate = new Date();

    const outstandingMonths = [];
    let nextPaymentDate = new Date(lastPaymentDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1); // Start from the next month

    while (nextPaymentDate <= currentDate) {
      outstandingMonths.push({
        month: nextPaymentDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
        amount: amt || 0,
        paid: false,
      });
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    }

    return outstandingMonths;
  };

  const handlePaymentSubmit = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found!');
        navigation.replace('/LoginScreen');
        return;
      }

      const paymentToSubmit = outstandingMonths[0]; // Payment to submit (assumes we pay for the first outstanding month)

      // Extract month and year
      const [month, year] = paymentToSubmit.month.split(' ');
      console.log('Extracted Month:', month, 'Year:', year); // Log extracted month and year

      // Month mapping
      const monthMap = {
        January: 0,
        February: 1,
        March: 2,
        April: 3,
        May: 4,
        June: 5,
        July: 6,
        August: 7,
        September: 8,
        October: 9,
        November: 10,
        December: 11,
      };

      // Get the month index from the mapping
      const monthIndex = monthMap[month];
      if (monthIndex === undefined) {
        console.error('Invalid month name:', month);
        return;
      }

      // Create a date object for the first day of the payment month
      const paymentDate = new Date(year, monthIndex, 1);

      // Check if paymentDate is valid
      if (isNaN(paymentDate.getTime())) {
        console.error('Invalid payment date:', paymentDate);
        return;
      }


      const paymentData = {
        rentalID: rentalID,
        amount: amt,
        date: paymentDate.toISOString(), // Convert to ISO string
      };

      const response = await axios.post(`${API_BASE_URL}/api/payment/monthlyPayment`, paymentData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        setIsPaymentSuccessful(true);
        await getPaymentHistory(); // Fetch the latest payment history
        // Optionally refresh payment history or outstanding months here
      } else {
        console.error('Payment failed:', response.data);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  const outstandingMonths = getOutstandingMonths();

  useEffect(() => {
    if (listingId && tenantId) {
      getPaymentHistory();
    } else {
      setLoading(false); // If listingId or tenantId is null, stop loading
    }
  }, [listingId, tenantId]);

  if (loading) {
    return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
    );
  }


  const paidMonths = paymentHistory.payments.map((payment) => {
    return {
      paymentID: payment.paymentID,
      rentalID: payment.rentalID,
      month: new Date(payment.date).toLocaleString('default', { month: 'long', year: 'numeric' }),
      amount: amt,
      paid: true,
      date: payment.date,
    };
  });

  const sortedPaidMonths = paidMonths.sort((a, b) => new Date(b.date) - new Date(a.date));
  const sortedOutstandingMonths = outstandingMonths.sort((a, b) => new Date(b.month) - new Date(a.month));

  const handlePayButtonPress = () => {
    setIsModalVisible(true);
  };

  // const handlePaymentSubmit = () => {
  //   setIsPaymentSuccessful(true);
  // };

  const handleReturnPress = () => {
    setIsPaymentSuccessful(false);
    setIsModalVisible(false);
  };

  return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Rent Payment</Text>

        {/* Outstanding Payments */}
        <Text style={styles.sectionTitle}>Outstanding Payments</Text>
        {sortedOutstandingMonths.length === 0 ? (
            <Text style={styles.noOutstandingText}>You have no outstanding payments.</Text>
        ) : (
            sortedOutstandingMonths.map((payment, index) => (
                <View key={index} style={styles.paymentBox}>
                  <Text style={styles.paymentDate}>{payment.month}</Text>
                  <Text style={styles.paymentAmount}>${amt}</Text>
                  <TouchableOpacity style={styles.payButton} onPress={handlePayButtonPress}>
                    <Text style={styles.payButtonText}>Pay</Text>
                  </TouchableOpacity>
                </View>
            ))
        )}

        {/* Payment History */}
        <Text style={styles.sectionTitle}>Payment History</Text>
        {sortedPaidMonths.length === 0 ? (
            <Text style={styles.noOutstandingText}>You have no payment history.</Text>
        ) : (
            sortedPaidMonths.map((payment, index) => (
                <View key={index} style={styles.paymentRow}>
                  <Text style={styles.paymentDate}>{payment.month}</Text>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentAmount}>${amt}</Text>
                    <Text style={styles.paymentStatus}></Text>
                  </View>
                </View>
            ))
        )}

        {/* Payment Modal */}
        <Modal
            visible={isModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={handleReturnPress}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={styles.modalBottom}>
                  {!isPaymentSuccessful ? (
                      <>
                        <Text style={styles.modalTitle}>Card Payment</Text>
                        <TextInput style={styles.input} placeholder="Card Number" keyboardType="numeric" />
                        <View style={styles.row}>
                          <TextInput style={[styles.input, styles.expirationInput]} placeholder="Expiration (MM/YY)" keyboardType="numeric" />
                          <TextInput style={[styles.input, styles.cvvInput]} placeholder="CVV" keyboardType="numeric" secureTextEntry />
                        </View>
                        <TextInput style={styles.input} placeholder="Postal Code" keyboardType="numeric" />
                        <TextInput style={styles.input} placeholder="Location" />
                        <TouchableOpacity style={styles.payButton} onPress={handlePaymentSubmit} disabled={outstandingMonths.length === 0}>
                          <Text style={styles.payButtonText}>Pay ${outstandingMonths.length > 0 ? outstandingMonths[0].amount : 0}</Text>
                        </TouchableOpacity>
                      </>
                  ) : (
                      <>
                        <Image source={require('../assets/images/confirmation.png')} style={styles.successImage} />
                        <Text style={styles.successText}>Payment Successful!</Text>
                        <TouchableOpacity style={styles.payButton2} onPress={handleReturnPress}>
                          <Text style={styles.payButtonText}>Return</Text>
                        </TouchableOpacity>
                      </>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  paymentBox: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  paymentDate: {
    fontSize: 16,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  payButton: {
    backgroundColor: 'black',
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  payButton2: {
      backgroundColor: 'black',
      paddingVertical: 10,
      borderRadius: 5,
      marginTop: 10,
      width: 120, // Set a specific width (adjust as needed)
        alignSelf: 'center', // Center the button horizontally
      },

  payButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentInfo: {
    alignItems: 'flex-end',
  },
  paymentStatus: {
    fontSize: 12,
    color: '#28a745',
  },
  smallText: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end', // Position the modal at the bottom
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dimmed background
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 10, // Add rounded corners at the top
    borderTopRightRadius: 10,
    width: '100%', // Full width of the screen
    maxHeight: '60%', // Limit height to keep it manageable
  },
  modalScroll: {
    paddingBottom: 0,
  },
  modalBottom: {
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  successImage: {
    width: 80,
    height: 80,
    marginBottom: 20,
    borderRadius: 50,
    alignSelf: 'center',
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
   row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    expirationInput: {
      flex: 0.7, // Takes 70% of the row space
      marginRight: 10, // Small gap to the CVV input
    },
    cvvInput: {
      flex: 0.3, // Takes 30% of the row space
    },
});

export default RentPaymentScreen;
