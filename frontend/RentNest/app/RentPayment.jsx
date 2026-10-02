import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {useLocalSearchParams, useRouter} from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import {API_BASE_URL} from "../config/api";
import MorphingInfinity from '../components/MorphingInfinity';

const notificationBellIcon = require('../assets/images/notificationBell.png');


// Rent Payment Screen
const RentPaymentScreen = () => {
  const router = useRouter();
  const { listingId, tenantId } = useLocalSearchParams();
  const [paymentHistory, setPaymentHistory] = useState(null); // State to store listing data
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [showPaymentUpdated, setShowPaymentUpdated] = useState(false);
  const [loading, setLoading] = useState(true); // New loading state
  const [rentalID, setRentalID] = useState(null);
  const [amt, setAmount] = useState(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [fieldTouched, setFieldTouched] = useState({});
  const [selectedPayment, setSelectedPayment] = useState(null);
  const notificationTimeoutRef = useRef(null);


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

  const getMonthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

  const addMonths = (date, months) => {
    const nextDate = new Date(date);
    nextDate.setMonth(nextDate.getMonth() + months);
    return getMonthStart(nextDate);
  };

  const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  const formatPaymentDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCardNumberInput = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiryInput = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) {
      return digits;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const markFieldTouched = (field) => {
    setFieldTouched((previous) => ({ ...previous, [field]: true }));
  };

  const getOutstandingMonths = () => {
    const payments = paymentHistory?.payments || [];
    const acceptedDateValue = paymentHistory?.acceptedAt || paymentHistory?.rentalDate;
    const acceptedDate = acceptedDateValue ? new Date(acceptedDateValue) : null;
    const currentMonth = getMonthStart(new Date());
    const startMonth = acceptedDate && !Number.isNaN(acceptedDate.getTime())
        ? getMonthStart(acceptedDate)
        : currentMonth;
    const paidMonthKeys = new Set(
        payments
            .map(payment => new Date(payment.date))
            .filter(date => !Number.isNaN(date.getTime()))
            .map(getMonthKey)
    );

    const outstandingMonths = [];
    let paymentMonth = new Date(startMonth);

    while (paymentMonth <= currentMonth) {
      if (!paidMonthKeys.has(getMonthKey(paymentMonth))) {
        outstandingMonths.push({
          month: formatMonthYear(paymentMonth),
          amount: paymentHistory?.rentalPrice || amt || 0,
          paid: false,
          dueDate: new Date(paymentMonth),
          status: getMonthKey(paymentMonth) === getMonthKey(currentMonth) ? 'dueNow' : 'overdue',
        });
      }
      paymentMonth = addMonths(paymentMonth, 1);
    }

    return outstandingMonths;
  };

  const getLockedFutureMonths = () => {
    const leaseExpiryDate = paymentHistory?.leaseExpiry ? new Date(paymentHistory.leaseExpiry) : null;
    if (!leaseExpiryDate || Number.isNaN(leaseExpiryDate.getTime())) return [];

    const lockedMonths = [];
    const leaseExpiryMonth = getMonthStart(leaseExpiryDate);
    let nextMonth = addMonths(getMonthStart(new Date()), 1);

    while (nextMonth <= leaseExpiryMonth && lockedMonths.length < 3) {
      lockedMonths.push({
        month: formatMonthYear(nextMonth),
        amount: paymentHistory?.rentalPrice || amt || 0,
        dueDate: new Date(nextMonth),
        status: 'locked',
      });
      nextMonth = addMonths(nextMonth, 1);
    }

    return lockedMonths;
  };

  const handlePaymentSubmit = async () => {
    if (isSubmittingPayment || !isCardFormValid) {
      setFieldTouched({
        cardNumber: true,
        cardExpiry: true,
        cardCvv: true,
        cardName: true,
      });
      return;
    }

    try {
      setIsSubmittingPayment(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found!');
        router.replace('/LoginScreen');
        return;
      }

      const paymentToSubmit = selectedPayment || outstandingMonths[0];
      if (!paymentToSubmit) {
        console.error('No outstanding payment selected.');
        return;
      }

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
        amount: paymentToSubmit.amount,
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
        await getPaymentHistory(); // Fetch the latest payment history
        setIsModalVisible(false);
        setCardNumber('');
        setCardExpiry('');
        setCardCvv('');
        setCardName('');
        setFieldTouched({});
        setSelectedPayment(null);
        setShowPaymentUpdated(true);
        if (notificationTimeoutRef.current) {
          clearTimeout(notificationTimeoutRef.current);
        }
        notificationTimeoutRef.current = setTimeout(() => {
          setShowPaymentUpdated(false);
        }, 2000);
      } else {
        console.error('Payment failed:', response.data);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const outstandingMonths = getOutstandingMonths();

  useEffect(() => {
    if (listingId && tenantId) {
      getPaymentHistory();
    } else {
      setLoading(false); // If listingId or tenantId is null, stop loading
    }

    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
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
  const paymentInModal = selectedPayment || outstandingMonths[0];
  const cardDigits = cardNumber.replace(/\D/g, '');
  const cardPrefix = Number(cardDigits.slice(0, 4));
  const isVisa = cardDigits.startsWith('4');
  const isMastercard =
      /^(5[1-5])/.test(cardDigits) ||
      (cardPrefix >= 2221 && cardPrefix <= 2720);
  const isCardNumberValid = cardDigits.length === 16 && (isVisa || isMastercard);
  const isExpiryValid = (() => {
    const match = cardExpiry.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return false;

    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    if (month < 1 || month > 12) return false;

    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const expiryMonth = new Date(year, month - 1, 1);
    return expiryMonth >= currentMonth;
  })();
  const isCvvValid = /^\d{3}$/.test(cardCvv);
  const isCardNameValid = /^[A-Za-z][A-Za-z\s'.-]{1,}$/.test(cardName.trim());
  const isCardFormValid =
      outstandingMonths.length > 0 &&
      rentalID !== null &&
      isCardNumberValid &&
      isExpiryValid &&
      isCvvValid &&
      isCardNameValid;
  const hasFieldError = (field, isValid) => fieldTouched[field] && !isValid;

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
  const sortedLockedFutureMonths = getLockedFutureMonths().sort((a, b) => a.dueDate - b.dueDate);
  const displayedOutstandingMonths = [...sortedOutstandingMonths, ...sortedLockedFutureMonths];

  const handlePayButtonPress = (payment) => {
    setSelectedPayment(payment);
    setIsModalVisible(true);
  };

  // const handlePaymentSubmit = () => {
  //   setIsPaymentSuccessful(true);
  // };

  const handleReturnPress = () => {
    setSelectedPayment(null);
    setIsModalVisible(false);
  };

  return (
      <View style={styles.screen}>
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

        <Text style={styles.sectionTitle}>OUTSTANDING PAYMENTS</Text>
        <View style={styles.outstandingPanel}>
          <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.panelScrollContent}
          >
            {displayedOutstandingMonths.length === 0 ? (
                <View style={styles.emptyCard}>
                  <MaterialIcons name="check-circle" size={24} color="#2FA84F" />
                  <Text style={styles.emptyTitle}>All caught up</Text>
                  <Text style={styles.noOutstandingText}>You have no outstanding payments.</Text>
                </View>
            ) : (
                displayedOutstandingMonths.map((payment) => {
                  const isLocked = payment.status === 'locked';
                  const isOverdue = payment.status === 'overdue';
                  const isDueNow = payment.status === 'dueNow';

                  return (
                    <View
                        key={payment.month}
                        style={[
                          styles.outstandingCard,
                          isOverdue && styles.overdueOutstandingCard,
                          isLocked && styles.lockedOutstandingCard,
                        ]}
                    >
                      <View style={styles.outstandingCopy}>
                        <View style={styles.outstandingHeader}>
                          <Text style={[styles.outstandingMonth, isLocked && styles.lockedText]}>{payment.month}</Text>
                          {!isLocked && (
                              <View style={[styles.dueBadge, isOverdue && styles.overdueBadge]}>
                                <Text style={styles.dueBadgeText}>{isDueNow ? 'Due Now' : 'Overdue'}</Text>
                              </View>
                          )}
                        </View>
                        <Text style={[styles.outstandingAmount, isLocked && styles.lockedText]}>
                          {formatCurrency(payment.amount)}
                        </Text>
                      </View>
                      {!isLocked ? (
                          <TouchableOpacity style={styles.payNowButton} onPress={() => handlePayButtonPress(payment)}>
                            <Text style={styles.payNowButtonText}>Pay now</Text>
                          </TouchableOpacity>
                      ) : (
                          <MaterialIcons name="lock-outline" size={22} color="#8E8E8E" />
                      )}
                    </View>
                  );
                })
            )}
          </ScrollView>
        </View>

        <Text style={styles.sectionTitle}>PAYMENT HISTORY</Text>
        <View style={styles.historyPanel}>
          <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.panelScrollContent}
          >
            {sortedPaidMonths.length === 0 ? (
                <Text style={styles.noOutstandingText}>You have no payment history.</Text>
            ) : (
                sortedPaidMonths.map((payment, index) => (
                    <View key={payment.paymentID || `${payment.month}-${index}`} style={styles.historyRow}>
                      <View style={styles.historyStatusIcon}>
                        <MaterialIcons name="check" size={20} color="#2FA84F" />
                      </View>
                      <View style={styles.historyCopy}>
                        <Text style={styles.historyMonth}>{payment.month}</Text>
                        <Text style={styles.historyDate}>{formatPaymentDate(payment.date)}</Text>
                      </View>
                      <Text style={styles.historyAmount}>{formatCurrency(payment.amount)}</Text>
                    </View>
                ))
            )}
          </ScrollView>
        </View>

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
                  <View style={styles.modalHandle} />
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Card payment</Text>
                    <View style={styles.secureBadge}>
                      <MaterialIcons name="lock-outline" size={16} color="#666" />
                      <Text style={styles.secureText}>Secure</Text>
                    </View>
                  </View>
                  <View style={styles.modalSummary}>
                    <View>
                      <Text style={styles.modalSummaryLabel}>
                        {paymentInModal ? `${paymentInModal.month} Rent` : 'Monthly rent'}
                      </Text>
                      <Text style={styles.modalSummaryAmount}>
                        {formatCurrency(paymentInModal ? paymentInModal.amount : monthlyRent)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardBrandRow}>
                    <View style={[styles.cardBrandBadge, styles.visaBadge]}>
                      <Text style={styles.visaText}>VISA</Text>
                    </View>
                    <View style={[styles.cardBrandBadge, styles.mastercardBadge]}>
                      <View style={styles.mastercardCircles}>
                        <View style={[styles.mastercardCircle, styles.mastercardRed]} />
                        <View style={[styles.mastercardCircle, styles.mastercardYellow]} />
                      </View>
                      <Text style={styles.mastercardText}>mastercard</Text>
                    </View>
                  </View>
                  <Text style={styles.inputLabel}>CARD NUMBER</Text>
                  <TextInput
                      style={[styles.input, hasFieldError('cardNumber', isCardNumberValid) && styles.inputError]}
                      placeholder="4111 1111 1111 1111"
                      placeholderTextColor="#8E8E8E"
                      keyboardType="numeric"
                      value={cardNumber}
                      onChangeText={(value) => setCardNumber(formatCardNumberInput(value))}
                      onBlur={() => markFieldTouched('cardNumber')}
                      maxLength={19}
                      editable={!isSubmittingPayment}
                  />
                  {hasFieldError('cardNumber', isCardNumberValid) && (
                      <Text style={styles.errorText}>Enter a valid Visa or Mastercard number.</Text>
                  )}
                  <View style={styles.row}>
                    <View style={styles.expirationInput}>
                      <Text style={styles.inputLabel}>EXPIRY</Text>
                      <TextInput
                          style={[styles.input, hasFieldError('cardExpiry', isExpiryValid) && styles.inputError]}
                          placeholder="MM/YY"
                          placeholderTextColor="#8E8E8E"
                          keyboardType="numeric"
                          value={cardExpiry}
                          onChangeText={(value) => setCardExpiry(formatExpiryInput(value))}
                          onBlur={() => markFieldTouched('cardExpiry')}
                          maxLength={5}
                          editable={!isSubmittingPayment}
                      />
                      {hasFieldError('cardExpiry', isExpiryValid) && (
                          <Text style={styles.errorText}>Use a valid future date.</Text>
                      )}
                    </View>
                    <View style={styles.cvvInput}>
                      <Text style={styles.inputLabel}>CVV</Text>
                      <TextInput
                          style={[styles.input, hasFieldError('cardCvv', isCvvValid) && styles.inputError]}
                          placeholder="123"
                          placeholderTextColor="#8E8E8E"
                          keyboardType="numeric"
                          value={cardCvv}
                          onChangeText={(value) => setCardCvv(value.replace(/\D/g, '').slice(0, 3))}
                          onBlur={() => markFieldTouched('cardCvv')}
                          maxLength={3}
                          secureTextEntry
                          editable={!isSubmittingPayment}
                      />
                      {hasFieldError('cardCvv', isCvvValid) && (
                          <Text style={styles.errorText}>Enter 3 digits.</Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.inputLabel}>NAME ON CARD</Text>
                  <TextInput
                      style={[styles.input, hasFieldError('cardName', isCardNameValid) && styles.inputError]}
                      placeholder="As it appears on your card"
                      placeholderTextColor="#8E8E8E"
                      autoCapitalize="words"
                      value={cardName}
                      onChangeText={setCardName}
                      onBlur={() => markFieldTouched('cardName')}
                      editable={!isSubmittingPayment}
                  />
                  {hasFieldError('cardName', isCardNameValid) && (
                      <Text style={styles.errorText}>Enter the name on your card.</Text>
                  )}
                  <TouchableOpacity
                      style={[styles.payButton, (!isCardFormValid || isSubmittingPayment) && styles.disabledPayButton]}
                      onPress={handlePaymentSubmit}
                      disabled={!isCardFormValid || isSubmittingPayment}
                  >
                    {isSubmittingPayment ? (
                        <View style={styles.payButtonContent}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.payButtonText}>Processing...</Text>
                        </View>
                    ) : (
                        <Text style={styles.payButtonText}>Pay {formatCurrency(paymentInModal ? paymentInModal.amount : 0)}</Text>
                    )}
                  </TouchableOpacity>
                  <View style={styles.encryptedRow}>
                    <MaterialIcons name="verified-user" size={16} color="#666" />
                    <Text style={styles.encryptedText}>Payments are encrypted and never stored</Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
        <Modal
            visible={showPaymentUpdated}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
          <View style={styles.notificationOverlay} pointerEvents="none">
            <View style={styles.notificationCard}>
              <View style={styles.notificationIconBox}>
                <Image source={notificationBellIcon} style={styles.notificationIcon} />
              </View>
              <Text style={styles.notificationText}>Payment Successful</Text>
            </View>
          </View>
        </Modal>
      </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 24,
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 18,
    color: '#101820',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E7E7E7',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '700',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 23,
    lineHeight: 28,
    color: '#101820',
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 4,
    color: '#333',
    letterSpacing: 0.8,
  },
  outstandingPanel: {
    maxHeight: 270,
    minHeight: 124,
    marginBottom: 14,
  },
  historyPanel: {
    flex: 1,
    minHeight: 170,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
  },
  panelScrollContent: {
    paddingBottom: 8,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E7E7',
    padding: 18,
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#101820',
  },
  outstandingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#101820',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  lockedOutstandingCard: {
    borderColor: '#E2E2E2',
    backgroundColor: '#F7F8FA',
  },
  overdueOutstandingCard: {
    borderColor: '#E24848',
  },
  outstandingCopy: {
    flex: 1,
    marginRight: 12,
  },
  outstandingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  outstandingMonth: {
    fontSize: 20,
    fontWeight: '800',
    color: '#101820',
  },
  outstandingAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
  },
  dueBadge: {
    backgroundColor: '#101820',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  overdueBadge: {
    backgroundColor: '#E24848',
  },
  dueBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  lockedText: {
    color: '#8E8E8E',
  },
  payNowButton: {
    borderWidth: 1,
    borderColor: '#101820',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    backgroundColor: '#101820',
  },
  payNowButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  historyStatusIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7EE',
    marginRight: 12,
  },
  historyCopy: {
    flex: 1,
  },
  historyMonth: {
    fontSize: 17,
    fontWeight: '800',
    color: '#101820',
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2FA84F',
  },
  payButton: {
    backgroundColor: '#101820',
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 2,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  payButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end', // Position the modal at the bottom
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dimmed background
  },
  modalContent: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 22,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%', // Full width of the screen
    maxHeight: '86%',
  },
  modalScroll: {
    paddingBottom: 0,
  },
  modalBottom: {
    paddingBottom: 10,
  },
  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D8D8D8',
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#101820',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  secureText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSummary: {
    backgroundColor: '#F7F8FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E7E7',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  modalSummaryLabel: {
    color: '#666',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSummaryAmount: {
    color: '#101820',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  cardBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardBrandBadge: {
    width: 48,
    height: 30,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visaBadge: {
    backgroundColor: '#1434CB',
  },
  visaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  mastercardBadge: {
    backgroundColor: '#101820',
  },
  mastercardCircles: {
    flexDirection: 'row',
    marginBottom: -1,
  },
  mastercardCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  mastercardRed: {
    backgroundColor: '#EB001B',
    marginRight: -5,
  },
  mastercardYellow: {
    backgroundColor: '#F79E1B',
  },
  mastercardText: {
    color: '#fff',
    fontSize: 6,
    fontWeight: '700',
  },
  inputLabel: {
    color: '#333',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D8D8D8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 14,
    fontSize: 16,
    color: '#101820',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#D64545',
    backgroundColor: '#FFF8F8',
  },
  errorText: {
    color: '#D64545',
    fontSize: 12,
    fontWeight: '600',
    marginTop: -8,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  expirationInput: {
    flex: 1,
  },
  cvvInput: {
    flex: 1,
  },
  disabledPayButton: {
    backgroundColor: '#999',
  },
  encryptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  encryptedText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  notificationOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  notificationCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: 'rgba(45, 45, 45, 0.82)',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    elevation: 8,
  },
  notificationIconBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58, 58, 58, 0.72)',
    marginBottom: 16,
  },
  notificationIcon: {
    width: 34,
    height: 40,
    resizeMode: 'contain',
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
});

export default RentPaymentScreen;
