import React, {useEffect, useRef, useState} from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Modal, Image } from 'react-native';
import {useLocalSearchParams, useRouter} from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {jwtDecode} from "jwt-decode";
import axios from "axios";
import {API_BASE_URL} from "../config/api";
import MorphingInfinity from '../components/MorphingInfinity';
import { FontAwesome } from '@expo/vector-icons';

const notificationBellIcon = require('../assets/images/notificationBell.png');

const TerminateLease = () => {
  const router = useRouter();
  const { rentalId } = useLocalSearchParams();
  const [user, setUser] = useState(null);
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState('refund');
  const [amount, setAmount] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const submissionRef = useRef(false);
  const notificationTimeoutRef = useRef(null);
  const generation = useRef(0);

  useEffect(() => {
    const version = ++generation.current;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      setUser(null);
      setRental(null);
      setShowSuccess(false);
      setSubmitting(false);
      submissionRef.current = false;
      try {
        const token = await AsyncStorage.getItem('token');
        if (version !== generation.current) return;
        if (!token) {
          router.replace('/LandingScreen');
          return;
        }
        const decoded = jwtDecode(token);
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };
        const [userResponse, rentalResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/users/${decoded.sub}`, { headers }),
          axios.get(`${API_BASE_URL}/api/rentals/${rentalId}`, { headers }),
        ]);
        if (version !== generation.current) return;
        setUser(userResponse.data);
        setRental(rentalResponse.data);
      } catch (error) {
        if (version === generation.current) setError('Unable to load this lease. Check your connection and retry.');
      } finally {
        if (version === generation.current) setLoading(false);
      }
    };
    fetchData();
    return () => {
      generation.current += 1;
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    };
  }, [rentalId, reload]);

  const validAmount = /^\d+$/.test(amount) && Number.isSafeInteger(Number(amount)) && Number(amount) > 0;
  const eligible = !!user && !!rental && Number(user.userID) === Number(rental.ownerUserId)
    && String(rental.status).toLowerCase() === 'active';
  const canSubmit = eligible && !submitting && !showSuccess && (selectedOption === 'no_refund' || validAmount);

  const submitTerminationRequest = async () => {
    if (!canSubmit || submissionRef.current) return;
    submissionRef.current = true;
    const version = generation.current;
    setSubmitting(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('token');
      if (version !== generation.current) return;
      if (!token) {
        router.replace('/LoginScreen');
        return;
      }
      const refundAmount = selectedOption === 'refund' ? amount : '0';
      await axios.post(
        `${API_BASE_URL}/api/requests/terminationrequest/${rentalId}/${refundAmount}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      if (version !== generation.current) return;
      setShowSuccess(true);
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = setTimeout(() => {
        if (version !== generation.current) return;
        setShowSuccess(false);
        router.push(`/ChatsScreen2?partnerUserId=${rental.tenantUserID}&currentUser=${user.userID}`);
      }, 2000);
    } catch (error) {
      if (version !== generation.current) return;
      const status = error?.response?.status;
      setError(status === 409 ? 'This lease already has a termination request or is no longer active. Open the chat to check its status.'
        : status === 403 ? 'Only the owner of this lease can submit a termination request.'
          : status === 401 ? 'Your session expired. Sign in again to continue.'
            : 'Unable to submit the request. Check your connection and try again.');
    } finally {
      if (version === generation.current) {
        submissionRef.current = false;
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MorphingInfinity size={86} color="#2FA84F" />
        <Text style={styles.loadingText}>Loading termination lease...</Text>
      </View>
    );
  }

  if (!eligible) {
    return (
      <View style={styles.loadingContainer}>
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error || 'Only the owner of an active lease can request termination.'}
        </Text>
        {!!error && <TouchableOpacity accessibilityRole="button" style={styles.backButton} onPress={() => setReload(value => value + 1)}><Text>Retry</Text></TouchableOpacity>}
        <TouchableOpacity accessibilityRole="button" style={styles.backButton} onPress={() => router.back()}><Text>Go back</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome name="chevron-left" size={18} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Terminate lease</Text>
        </View>

        {/* Warning banner */}
        <View style={styles.warningBanner}>
          <FontAwesome name="exclamation-circle" size={16} color="#c07000" style={styles.warningIcon} />
          <Text style={styles.warningText}>
            Fill in the agreed terms from your rental agreement. The tenant must accept before termination proceeds.
          </Text>
        </View>

        {/* Termination type */}
        <Text style={styles.sectionLabel}>TERMINATION TYPE</Text>
        <View style={styles.optionsRow}>
          <TouchableOpacity
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedOption === 'refund', disabled: submitting }}
            disabled={submitting}
            style={[styles.optionButton, selectedOption === 'refund' && styles.optionSelected]}
            onPress={() => setSelectedOption('refund')}
          >
            <FontAwesome name="money" size={22} color="#505860" />
            <Text style={[styles.optionText, selectedOption === 'refund' && styles.optionTextSelected]}>
              Refund tenant
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedOption === 'no_refund', disabled: submitting }}
            disabled={submitting}
            style={[styles.optionButton, selectedOption === 'no_refund' && styles.optionSelected]}
            onPress={() => { setSelectedOption('no_refund'); setAmount(''); }}
          >
            <FontAwesome name="ban" size={22} color="#505860" />
            <Text style={[styles.optionText, selectedOption === 'no_refund' && styles.optionTextSelected]}>
              No refund
            </Text>
          </TouchableOpacity>
        </View>

        {/* Refund amount */}
        <Text style={styles.sectionLabel}>REFUND AMOUNT</Text>
        <View style={[styles.amountInputRow, selectedOption === 'no_refund' && styles.amountInputDisabled]}>
          <Text style={styles.dollarSign}>$</Text>
          <TextInput
            style={styles.amountInput}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            accessibilityLabel="Refund amount in whole Singapore dollars"
            editable={selectedOption === 'refund' && !submitting}
            placeholder="0"
            placeholderTextColor="#626970"
          />
        </View>
        <Text style={styles.amountHint}>Enter the agreed refund in whole Singapore dollars, without cents.</Text>
        {selectedOption === 'refund' && amount !== '' && !validAmount && (
          <Text accessibilityRole="alert" style={styles.errorText}>Enter a positive whole-dollar amount, or select No refund.</Text>
        )}

        {/* Summary */}
        <Text style={styles.sectionLabel}>SUMMARY</Text>
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Rental ID</Text>
            <Text style={styles.summaryValue}>#{rentalId}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Type</Text>
            <Text style={styles.summaryValue}>
              {selectedOption === 'refund' ? 'Refund tenant' : 'No refund'}
            </Text>
          </View>
          {selectedOption === 'refund' && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Refund amount</Text>
              <Text style={[styles.summaryValue, styles.summaryRefundAmount]}>
                {validAmount ? `SGD ${Number(amount).toLocaleString('en-SG')}` : 'Not entered'}
              </Text>
            </View>
          )}
        </View>

        {/* Submit button */}
        {!!error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
        {!!error && (
          <TouchableOpacity accessibilityRole="button" style={styles.backButton} onPress={() => router.push(`/ChatsScreen2?partnerUserId=${rental.tenantUserID}&currentUser=${user.userID}`)}>
            <Text>View tenant chat</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit, busy: submitting }}
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={submitTerminationRequest}
          disabled={!canSubmit}
        >
          <FontAwesome name="ban" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.submitButtonText}>{submitting ? 'Submitting...' : 'Submit termination'}</Text>
        </TouchableOpacity>
        <Text style={styles.submitDisclaimer}>This action cannot be undone once the tenant accepts.</Text>
      </ScrollView>

      {/* Success notification */}
      <Modal visible={showSuccess} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.notificationOverlay} pointerEvents="none">
          <View style={styles.notificationCard}>
            <View style={styles.notificationIconBox}>
              <Image source={notificationBellIcon} style={styles.notificationIcon} />
            </View>
            <Text style={styles.notificationText}>Termination Submitted</Text>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
    marginBottom: 16,
  },
  backButton: {
    marginRight: 12,
    padding: 12,
    minHeight: 44,
    minWidth: 44,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#fff8ee',
    borderColor: '#f5c97a',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  warningIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#8a5c00',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#626970',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  optionButton: {
    flex: 1,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  optionSelected: {
    borderColor: '#2FA84F',
    backgroundColor: '#f0faf3',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  optionTextSelected: {
    color: '#2FA84F',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2FA84F',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  amountInputDisabled: {
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    color: '#333',
  },
  amountHint: {
    fontSize: 12,
    color: '#626970',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#A12B2B',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  summaryBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryKey: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  summaryRefundAmount: {
    color: '#e53e3e',
  },
  submitButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#B52E2E',
    borderRadius: 8,
    marginBottom: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitDisclaimer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#626970',
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

export default TerminateLease;
