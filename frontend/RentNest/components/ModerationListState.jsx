import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';

// Turns a failed moderation-list request into a message an admin can act on
export const moderationLoadError = (error, itemsLabel) => {
  const status = error?.response?.status;
  if (status === 401 || status === 403) return 'You need to be logged in as an admin to see this.';
  if (!error?.response) return "Can't reach the server. Check your connection and try again.";
  return `Couldn't load reported ${itemsLabel}. Please try again.`;
};

/**
 * What a moderation list shows when it has no rows. Loading, a failed request and a genuinely
 * empty list look different, so an admin never mistakes an error for "nothing reported".
 */
const ModerationListState = ({ loading, error, searching, emptyText, onRetry }) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#222222" />
        <Text style={styles.message}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} accessibilityRole="button">
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (searching) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>No results match your search.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{emptyText}</Text>
      <Text style={styles.message}>Pull down to refresh.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666666',
    marginTop: 6,
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    color: '#b3261e',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#222222',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 6,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ModerationListState;
