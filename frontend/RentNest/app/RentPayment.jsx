import { useEffect, useState } from 'react';
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
import {useLocalSearchParams, useRouter} from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import {API_BASE_URL} from "../config/api";
import MorphingInfinity from '../components/MorphingInfinity';


// Rent Payment Screen
const RentPaymentScreen = () => {
  const router = useRouter();
  const { listingId, tenantId } = useLocalSearchParams();
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
        router.replace('/LoginScreen');
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
      const payments = response.data.payments || [];
      const rentalID = payments.length > 0 ? payments[0].rentalID : null;
      setRentalID(rentalID);
      setAmount(response.data.rentalPrice || (payments.length > 0 ? payments[0].amount : 0));
      console.log("Payments response", response.status, response.data);
      setPaymentHistory(response.data);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  };


  const formatCurrency = (value) => {
    const amount = Number(value) || 0;
    return `S$${amount.toLocaleString()}`;
  };

  const formatMonthYear = (date) => (
      date.toLocaleString('default', { month: 'long', year: 'numeric' })
  );

  const formatPaymentDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getOutstandingMonths = () => {
    const payments = paymentHistory?.payments || [];
    if (!payments.length) return [];

    // Get the latest payment date
    const lastPaymentDate = new Date(Math.max(...payments.map(payment => new Date(payment.date))));
    const currentDate = new Date();

    const outstandingMonths = [];
    let nextPaymentDate = new Date(lastPaymentDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1); // Start from the next month

    while (nextPaymentDate <= currentDate) {
      outstandingMonths.push({
        month: formatMonthYear(nextPaymentDate),
        amount: paymentHistory?.rentalPrice || amt || 0,
        paid: false,
        dueDate: new Date(nextPaymentDate),
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
        router.replace('/LoginScreen');
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
          <MorphingInfinity size={86} color="#2FA84F" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
    );
  }


  const payments = paymentHistory?.payments || [];
  const monthlyRent = paymentHistory?.rentalPrice || amt || 0;
  const outstandingTotal = outstandingMonths.reduce((total, payment) => total + (Number(payment.amount) || 0), 0);

  const paidMonths = payments.map((payment) => {
    return {
      paymentID: payment.paymentID,
      rentalID: payment.rentalID,
      month: formatMonthYear(new Date(payment.date)),
      amount: payment.amount || monthlyRent,
      paid: true,
      date: payment.date,
    };
  });

  const sortedPaidMonths = paidMonths.sort((a, b) => new Date(b.date) - new Date(a.date));
  const sortedOutstandingMonths = outstandingMonths.sort((a, b) => a.dueDate - b.dueDate);

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

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Outstanding</Text>
            <Text style={styles.summaryValue}>{formatCurrency(outstandingTotal)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Monthly rent</Text>
            <Text style={styles.summaryValue}>{formatCurrency(monthlyRent)}</Text>
          </View>
        </View>

        {/* Outstanding Payments */}
        <Text style={styles.sectionTitle}>OUTSTANDING PAYMENTS</Text>
        {sortedOutstandingMonths.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="check-circle" size={28} color="#2FA84F" />
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.noOutstandingText}>You have no outstanding payments.</Text>
            </View>
        ) : (
            sortedOutstandingMonths.map((payment, index) => (
                <View
                    key={payment.month}
                    style={[styles.outstandingCard, index > 0 && styles.lockedOutstandingCard]}
                >
                  <View style={styles.outstandingCopy}>
                    <View style={styles.outstandingHeader}>
                      <Text style={[styles.outstandingMonth, index > 0 && styles.lockedText]}>{payment.month}</Text>
                      {index === 0 && (
                          <View style={styles.dueBadge}>
                            <Text style={styles.dueBadgeText}>Due now</Text>
                          </View>
                      )}
                    </View>
                    <Text style={[styles.outstandingAmount, index > 0 && styles.lockedText]}>
                      {formatCurrency(payment.amount)}
                    </Text>
                  </View>
                  {index === 0 ? (
                      <TouchableOpacity style={styles.payNowButton} onPress={handlePayButtonPress}>
                        <Text style={styles.payNowButtonText}>Pay now</Text>
                      </TouchableOpacity>
                  ) : (
                      <MaterialIcons name="lock-outline" size={26} color="#8E8E8E" />
                  )}
                </View>
            ))
        )}

        {/* Payment History */}
        <Text style={styles.sectionTitle}>PAYMENT HISTORY</Text>
        {sortedPaidMonths.length === 0 ? (
            <Text style={styles.noOutstandingText}>You have no payment history.</Text>
        ) : (
            sortedPaidMonths.map((payment, index) => (
                <View key={payment.paymentID || `${payment.month}-${index}`} style={styles.historyRow}>
                  <View style={styles.historyStatusIcon}>
                    <MaterialIcons name="check" size={24} color="#2FA84F" />
                  </View>
                  <View style={styles.historyCopy}>
                    <Text style={styles.historyMonth}>{payment.month}</Text>
                    <Text style={styles.historyDate}>{formatPaymentDate(payment.date)}</Text>
                  </View>
                  <Text style={styles.historyAmount}>{formatCurrency(payment.amount)}</Text>
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
                          <Text style={styles.payButtonText}>Pay {formatCurrency(outstandingMonths.length > 0 ? outstandingMonths[0].amount : 0)}</Text>
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
    paddingBottom: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
  },
  loadingText: {
    marginTop: 24,
    color: '#101820',
    fontSize: 18,
    fontWeight: '700',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#101820',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 28,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#E7E7E7',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 30,
    lineHeight: 36,
    color: '#101820',
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14,
    marginTop: 6,
    color: '#333',
    letterSpacing: 0.8,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E7E7',
    padding: 24,
    marginBottom: 28,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '800',
    color: '#101820',
  },
  outstandingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#101820',
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  lockedOutstandingCard: {
    borderColor: '#E2E2E2',
    backgroundColor: '#F7F8FA',
  },
  outstandingCopy: {
    flex: 1,
    marginRight: 12,
  },
  outstandingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  outstandingMonth: {
    fontSize: 24,
    fontWeight: '800',
    color: '#101820',
  },
  outstandingAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
  },
  dueBadge: {
    backgroundColor: '#101820',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dueBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  lockedText: {
    color: '#8E8E8E',
  },
  payNowButton: {
    borderWidth: 1,
    borderColor: '#101820',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 22,
    backgroundColor: '#101820',
  },
  payNowButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  historyStatusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7EE',
    marginRight: 16,
  },
  historyCopy: {
    flex: 1,
  },
  historyMonth: {
    fontSize: 20,
    fontWeight: '800',
    color: '#101820',
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2FA84F',
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
