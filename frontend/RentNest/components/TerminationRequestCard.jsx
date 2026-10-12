import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export function terminationError(error) {
  const status = error?.response?.status;
  if (status === 401) return 'Your session expired. Sign in again to continue.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'This termination request is no longer available.';
  if (status === 409) return 'The request or lease has changed. Refresh to see its current status.';
  return 'Unable to save your response. Check your connection and try again.';
}

export default function TerminationRequestCard({ requestId, onDecision }) {
  const [request, setRequest] = useState(null);
  const [viewerId, setViewerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const inFlight = useRef(false);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true);
    setConfirming(false);
    setError('');
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw { response: { status: 401 } };
      const headers = { Authorization: `Bearer ${token}` };
      const [response, user] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/requests/${requestId}`, { headers }),
        axios.get(`${API_BASE_URL}/api/users/${encodeURIComponent(jwtDecode(token).sub)}`, { headers }),
      ]);
      if (version !== generation.current) return;
      setRequest(response.data);
      setViewerId(user.data.userID);
    } catch (failure) {
      if (version !== generation.current) return;
      setRequest(null);
      setError(failure?.response ? terminationError(failure) : 'Unable to load this request. Check your connection and retry.');
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [requestId]);

  useFocusEffect(useCallback(() => {
    load();
    return () => { generation.current += 1; };
  }, [load]));

  const status = String(request?.status || '').toLowerCase();
  const accepted = status === 'terminated';
  const rejected = status === 'rejected';
  const pending = status === 'pending';
  const isTenant = viewerId != null && Number(viewerId) === Number(request?.tenantUserId);
  const canDecide = pending && isTenant && !loading;

  const decide = async (decision) => {
    if (!canDecide || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    const version = generation.current;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw { response: { status: 401 } };
      const response = await axios.post(
        `${API_BASE_URL}/api/requests/${requestId}/decision`,
        { decision },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (version !== generation.current) return;
      setRequest(response.data);
      setConfirming(false);
      onDecision?.();
    } catch (failure) {
      if (version === generation.current) {
        setError(terminationError(failure));
        setConfirming(false);
        // A failed response can follow a committed decision; require a fresh read before retry.
        setRequest(null);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const label = accepted ? 'Accepted' : rejected ? 'Rejected' : pending ? 'Pending' : 'Unavailable';
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Lease termination</Text>
        {!loading && request && (
          <Text style={[styles.status, accepted && styles.accepted, rejected && styles.rejected]}>{label}</Text>
        )}
      </View>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#101820" />
          <Text style={styles.description}>Loading request...</Text>
        </View>
      ) : request ? (
        <>
          {!!request.listingName && <Text style={styles.property}>{request.listingName}</Text>}
          <View style={styles.refund}>
            <Text style={styles.description}>Refund to tenant</Text>
            <Text style={styles.amount}>
              {new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(request.refundAmount)}
            </Text>
          </View>
          <Text style={styles.description}>
            {accepted ? 'The tenant accepted. This lease has ended.'
              : rejected ? 'The tenant rejected this request. The lease remains active.'
                : pending ? (isTenant ? 'Accepting ends your lease immediately.' : 'Awaiting the tenant\u2019s response. The lease remains active.')
                  : 'This request cannot be acted on. Refresh to check its status.'}
          </Text>
          {canDecide && (
            <View style={styles.actions}>
              {confirming ? (
                <>
                  <Text style={styles.confirmation}>End this lease on the terms above? This cannot be undone.</Text>
                  <TouchableOpacity accessibilityRole="button" disabled={busy} style={[styles.primary, busy && styles.disabled]} onPress={() => decide('accept')}>
                    <Text style={styles.primaryText}>{busy ? 'Saving...' : 'Confirm termination'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => setConfirming(false)}>
                    <Text style={styles.secondaryText}>Go back</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity accessibilityRole="button" disabled={busy} style={[styles.primary, busy && styles.disabled]} onPress={() => setConfirming(true)}>
                    <Text style={styles.primaryText}>Accept termination</Text>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => decide('reject')}>
                    <Text style={styles.secondaryText}>{busy ? 'Saving...' : 'Reject request'}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </>
      ) : null}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!loading && !busy && (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh termination request" style={styles.refresh} onPress={load}>
          <Text style={styles.refreshText}>{error ? 'Refresh and retry' : 'Refresh status'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D9DDE1', borderRadius: 16, padding: 16, gap: 14 },
  header: { gap: 10, alignItems: 'flex-start' },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: '#101820' },
  status: { fontSize: 12, fontWeight: '700', color: '#795200', backgroundColor: '#FFF2D9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  accepted: { color: '#17603A', backgroundColor: '#EAF5EE' },
  rejected: { color: '#8F3030', backgroundColor: '#FBECEC' },
  property: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#101820' },
  refund: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E8EAED', paddingVertical: 14, gap: 6 },
  amount: { fontSize: 26, lineHeight: 34, fontWeight: '700', color: '#101820', fontVariant: ['tabular-nums'] },
  description: { fontSize: 14, lineHeight: 21, color: '#505860' },
  loading: { gap: 10, alignItems: 'flex-start' },
  actions: { gap: 8 },
  primary: { minHeight: 48, padding: 12, borderRadius: 10, backgroundColor: '#101820', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  secondary: { minHeight: 48, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#CED3D8', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '600', color: '#101820', textAlign: 'center' },
  confirmation: { color: '#8F3030', fontSize: 14, lineHeight: 21 },
  disabled: { opacity: 0.6 },
  error: { color: '#A12B2B', fontSize: 14, lineHeight: 21 },
  refresh: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  refreshText: { color: '#505860', fontSize: 13, textDecorationLine: 'underline' },
});
