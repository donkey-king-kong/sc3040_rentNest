import React, {useEffect, useRef, useState} from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Modal, Image, Alert } from 'react-native';
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
  const notificationTimeoutRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
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
        setUser(userResponse.data);
        setRental(rentalResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => {
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    };
  }, [rentalId]);

  const canSubmit = selectedOption === 'no_refund' || (selectedOption === 'refund' && amount.trim() !== '');

  const submitTerminationRequest = async () => {
    if (!canSubmit) return;
    try {
      const token = await AsyncStorage.getItem('token');
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
      setShowSuccess(true);
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = setTimeout(() => {
        setShowSuccess(false);
        router.push(`/ChatsScreen2?partnerUserId=${rental.tenantUserID}&currentUser=${user.userID}`);
      }, 2000);
    } catch (error) {
      console.error('Error sending termination request:', error);
      Alert.alert('Error', 'Failed to submit termination request.');
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
            style={[styles.optionButton, selectedOption === 'refund' && styles.optionSelected]}
            onPress={() => setSelectedOption('refund')}
          >
            <Text style={styles.optionEmoji}>💰</Text>
            <Text style={[styles.optionText, selectedOption === 'refund' && styles.optionTextSelected]}>
              Refund tenant
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, selectedOption === 'no_refund' && styles.optionSelected]}
            onPress={() => { setSelectedOption('no_refund'); setAmount(''); }}
          >
            <Text style={styles.optionEmoji}>🚫</Text>
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
            editable={selectedOption === 'refund'}
            placeholder="0"
            placeholderTextColor="#aaa"
          />
        </View>
        <Text style={styles.amountHint}>Enter the agreed refund amount (e.g. deposit or partial month)</Text>

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
                ${Number(amount || 0).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={submitTerminationRequest}
          disabled={!canSubmit}
        >
          <FontAwesome name="ban" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.submitButtonText}>Submit termination</Text>
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
    padding: 4,
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
    color: '#999',
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
  optionEmoji: {
    fontSize: 22,
    marginBottom: 4,
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
    color: '#aaa',
    marginBottom: 20,
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
    backgroundColor: '#e53e3e',
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
    color: '#aaa',
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
