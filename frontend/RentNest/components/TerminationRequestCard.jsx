import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FontAwesome, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { inboxStore } from '../config/inbox';

export function terminationError(error) {
  const status = error?.response?.status;
  if (status === 401) return 'Your session expired. Sign in again to continue.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'This termination request is no longer available.';
  if (status === 409) return 'The request or lease has changed. Refresh to see its current status.';
  return 'Unable to save your response. Check your connection and try again.';
}

/**
 * `initialRequest` and `viewerId` are optional data the chat already preloaded. When both are
 * given the card renders immediately and only refreshes in the background.
 */
export default function TerminationRequestCard({ requestId, onDecision, initialRequest, viewerId: initialViewerId }) {
  const preloaded = initialRequest != null && initialViewerId != null;
  const [request, setRequest] = useState(preloaded ? initialRequest : null);
  const [viewerId, setViewerId] = useState(preloaded ? initialViewerId : null);
  const [loading, setLoading] = useState(!preloaded);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const inFlight = useRef(false);
  const generation = useRef(0);
  // The request ID whose data is currently on screen, so a refresh of it needs no spinner.
  const shownFor = useRef(preloaded ? requestId : null);

  const load = useCallback(async ({ quiet = false } = {}) => {
    const version = ++generation.current;
    if (!quiet || shownFor.current !== requestId) setLoading(true);
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
      shownFor.current = requestId;
    } catch (failure) {
      if (version !== generation.current) return;
      shownFor.current = null;
      setRequest(null);
      setError(failure?.response ? terminationError(failure) : 'Unable to load this request. Check your connection and retry.');
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [requestId]);

  useFocusEffect(useCallback(() => {
    load({ quiet: true });
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
    // Invalidates any background refresh still in flight, so it cannot overwrite the decision.
    const version = ++generation.current;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw { response: { status: 401 } };
      const response = await axios.post(
        `${API_BASE_URL}/api/requests/${requestId}/decision`,
        { decision },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      inboxStore.invalidate();
      if (version !== generation.current) return;
      setRequest(response.data);
      setConfirming(false);
      onDecision?.(decision);
    } catch (failure) {
      if (version === generation.current) {
        setError(terminationError(failure));
        setConfirming(false);
        // A failed response can follow a committed decision; require a fresh read before retry.
        shownFor.current = null;
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
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <FontAwesome name="file-text-o" size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Lease termination</Text>
        </View>
        {!loading && request && (
          <View style={[styles.statusPill, accepted && styles.acceptedPill, rejected && styles.rejectedPill]}>
            <Text style={[styles.status, accepted && styles.accepted, rejected && styles.rejected]}>{label}</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#101820" />
          <Text style={styles.description}>Loading request...</Text>
        </View>
      ) : request ? (
        <>
          {!!request.listingName && <Text style={styles.property}>{request.listingName}</Text>}
          <View style={styles.detailRow}>
            <View style={styles.detailLabelGroup}>
              <Feather name="rotate-ccw" size={15} color="#8F8F96" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Deposit refund</Text>
            </View>
            <Text style={styles.detailValue}>
              {new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(request.refundAmount)}
            </Text>
          </View>
          {canDecide ? (
            <View style={styles.actions}>
              {confirming ? (
                <>
                  <Text style={styles.confirmation}>End this lease on the terms above? This cannot be undone.</Text>
                  <View style={styles.actionRow}>
                    <TouchableOpacity accessibilityRole="button" disabled={busy} style={[styles.secondary, styles.actionBtn]} onPress={() => setConfirming(false)}>
                      <Text style={styles.secondaryText}>Go back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" disabled={busy} style={[styles.primary, styles.actionBtn, busy && styles.disabled]} onPress={() => decide('accept')}>
                      <Text style={styles.primaryText}>{busy ? 'Saving...' : 'Confirm'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.actionRow}>
                  <TouchableOpacity accessibilityRole="button" disabled={busy} style={[styles.secondary, styles.actionBtn]} onPress={() => decide('reject')}>
                    <Text style={styles.secondaryText}>{busy ? 'Saving...' : 'Decline'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" disabled={busy} style={[styles.primary, styles.actionBtn, busy && styles.disabled]} onPress={() => setConfirming(true)}>
                    <Text style={styles.primaryText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.statusFooter}>
              <View style={[styles.statusDot, (accepted || rejected) && styles.statusDotSettled]} />
              <Text style={styles.statusFooterText}>
                {accepted ? 'Lease ended'
                  : rejected ? 'Request rejected'
                    : pending ? (isTenant ? 'Awaiting your response' : 'Awaiting tenant response')
                      : 'Status unavailable'}
              </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  // Matches the rental offer card in chat: dark header with an icon badge and a status pill.
  card: {
    backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: 'rgba(60, 60, 67, 0.18)', borderRadius: 16,
    marginTop: 5, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  header: {
    backgroundColor: '#1c1c1e', paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  iconBadge: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#444447',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: '#FFFFFF', flexShrink: 1 },
  body: { paddingHorizontal: 16, paddingTop: 16 },
  statusPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255, 159, 10, 0.18)' },
  acceptedPill: { backgroundColor: '#DDF8E5' },
  rejectedPill: { backgroundColor: 'rgba(255, 69, 58, 0.18)' },
  status: { fontSize: 13, fontWeight: '800', color: '#FF9F0A' },
  accepted: { color: '#1C8E3A' },
  rejected: { color: '#FF453A' },
  property: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#101820', marginBottom: 4 },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ECECEF', gap: 12,
  },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabelGroup: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  detailIcon: { width: 18, textAlign: 'center', marginRight: 10 },
  detailLabel: { color: '#85858C', fontSize: 16, fontWeight: '700' },
  detailValue: { color: '#1C1C20', fontSize: 16, fontWeight: '800', textAlign: 'right', flexShrink: 1, fontVariant: ['tabular-nums'] },
  description: { fontSize: 14, lineHeight: 21, color: '#505860' },
  loading: { gap: 10, alignItems: 'flex-start', paddingBottom: 16 },
  actions: { paddingTop: 4, paddingBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1 },
  primary: { height: 40, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#101820', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  secondary: { height: 40, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#CED3D8', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '600', color: '#101820', textAlign: 'center' },
  confirmation: { color: '#8F3030', fontSize: 14, lineHeight: 21, marginBottom: 8 },
  statusFooter: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F1F5', borderRadius: 14, padding: 14, marginTop: 4, marginBottom: 16 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8F8F96', marginRight: 8 },
  statusDotSettled: { backgroundColor: '#1C8E3A' },
  statusFooterText: { fontSize: 14, fontWeight: '600', color: '#505860' },
  disabled: { opacity: 0.6 },
  error: { color: '#A12B2B', fontSize: 14, lineHeight: 21, paddingBottom: 8 },
  refresh: { paddingVertical: 12, justifyContent: 'center', alignSelf: 'flex-start' },
  refreshText: { color: '#505860', fontSize: 13, textDecorationLine: 'underline' },
});
