import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, AppState } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import NavigationBar from '../components/NavigationBar';
import { inboxStore } from '../config/inbox';
import MorphingInfinity from '../components/MorphingInfinity';
import ListingImage from '../components/ListingImage';

const InboxScreen = () => {
  const router = useRouter();
  const state = useSyncExternalStore(inboxStore.subscribe, inboxStore.getSnapshot, inboxStore.getSnapshot);
  const userListings = state.data || [];
  const isLoading = state.data === null && !state.error;

  useFocusEffect(useCallback(() => {
    inboxStore.refresh('focus');
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') inboxStore.refresh('focus');
    });
    return () => subscription.remove();
  }, []));
  useEffect(() => {
    if (state.unauthenticated) router.replace('/LoginScreen');
  }, [state.unauthenticated, router]);

  // Render each listing item
  const renderItem = ({ item }) => {
    const isOwner = item.role === 'Owner';
    const isTenant = item.role === 'Tenant';

    return (
      <TouchableOpacity
        style={styles.listingContainer}
        accessibilityRole="button"
        accessibilityLabel={`${item.name || 'Unnamed property'}, ${item.role}`}
        onPress={() => {
          if (isOwner) {
            router.push({
              pathname: '/RentalInfoOwnerScreen',
              params: { listingId: item.listingID },
            });
          } else if (isTenant) {
            router.push({
              pathname: '/RentalInfoTenantScreen',
              params: { listingId: item.listingID, tenantId: item.tenantId },
            });
          } 
        }}
      >
        <ListingImage
          uri={item.listingpicture}
          style={styles.image}
          screen="InboxScreen"
          diagnostics={false}
          listingId={item.listingID}
          listingName={item.name}
          width={160}
          height={160}
        />
        <View style={styles.detailsContainer}>
          <View style={styles.roleBox}>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
          <Text style={styles.title}>{item.name || 'Unnamed property'}</Text>
          <Text style={styles.address}>{item.location || 'Location not specified'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Inbox</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Refresh inbox"
            accessibilityState={{ disabled: state.loading }}
            disabled={state.loading}
            onPress={() => inboxStore.refresh('manual')}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshText}>{state.loading ? 'Refreshing...' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>
        {state.error && !state.unauthenticated ? (
          <View style={styles.errorContainer}>
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.errorText}>
              {state.data === null ? 'Could not load your inbox. Check your connection and try again.' : state.error}
            </Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => inboxStore.refresh('manual')}
              style={styles.refreshButton} disabled={state.loading}>
              <Text style={styles.refreshText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <MorphingInfinity size={86} color="#2FA84F" />
            <Text accessibilityLiveRegion="polite" style={styles.loadingText}>Loading inbox...</Text>
          </View>
        ) : <FlatList
          data={userListings}
          renderItem={renderItem}
          keyExtractor={(item) => item.listingID.toString()}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews
          refreshing={state.loading}
          onRefresh={() => inboxStore.refresh('manual')}
          contentContainerStyle={userListings.length === 0 ? { flexGrow: 1 } : null}
          ListEmptyComponent={state.error ? null :
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No active rentals</Text>
              <Text style={styles.emptySubtitle}>Your inbox will show rentals you own or are tenanting.</Text>
            </View>
          }
        />}
      </View>
      <NavigationBar style={styles.navigationBar} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'space-between', // Ensures navigation bar stays at the bottom
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
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
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    paddingHorizontal: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  refreshText: { color: '#205C43', fontSize: 16, fontWeight: '600' },
  errorContainer: { marginBottom: 16 },
  errorText: { color: '#9B263D', fontSize: 16, lineHeight: 24 },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  listingContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 15,
  },
  detailsContainer: {
    flex: 1,
  },
  roleBox: {
    backgroundColor: 'black',
    padding: 5,
    borderRadius: 5,
    marginBottom: 5,
    alignSelf: 'flex-start',
  },
  roleText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  address: {
    fontSize: 16,
    color: '#666',
  },
  navigationBar: {
    height: 60,
    backgroundColor: '#fff',
  },
});

export default InboxScreen;
