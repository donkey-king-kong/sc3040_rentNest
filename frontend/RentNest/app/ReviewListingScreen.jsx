import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import ModerationListState, { moderationLoadError } from '../components/ModerationListState';
import { AdminHeader, AdminLoadingState } from '../components/AdminUI';
import ProfileImage from '../components/ProfileImage';
import { moderationDismissals, useModerationDismissals } from '../config/moderationDismissals';

const ReviewListingsScreen = () => {
  const [listingsData, setListingsData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const router = useRouter();
  const requestVersion = useRef(0);
  const dismissals = useModerationDismissals('listings');
  const seenCompletionVersion = useRef(dismissals.completionVersion);

  const getFlaggedListings = useCallback(async () => {
    const version = ++requestVersion.current;
    setRefreshing(true);
    setLoadError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if (version !== requestVersion.current) return;
      
      if (!token) {
        console.log('No token found!');
        router.replace('/LoginScreen');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/api/listings/admin/flagged`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });
      
      console.log("Flagged Listings Response:", response.data);

      // Get owner details for each listing
      const listingsWithOwners = await Promise.all(response.data.map(async (listing) => {
        console.log("Processing listing:", listing);
        return {
          listingID: listing.listingID,
          name: listing.name,
          location: listing.location,
          price: listing.price,
          flagged: listing.flagged,
          owner: {
            userID: listing.ownerID,
            name: listing.ownerName || 'Unknown Owner',
            photoURL: listing.ownerPhotoURL || null
          },
          type: listing.type,
          description: listing.description
        };
      }));
      if (version !== requestVersion.current) return;
      moderationDismissals.reconcile(
        'listings',
        listingsWithOwners.map(listing => listing.listingID),
      );
      setListingsData(listingsWithOwners);
    } catch (error) {
      if (version !== requestVersion.current) return;
      console.error("An error occurred:", error);
      setListingsData([]);
      setLoadError(moderationLoadError(error, 'listings'));
    } finally {
      if (version === requestVersion.current) setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => {
    void getFlaggedListings();
    // A response started before leaving must not overwrite the refreshed list on return.
    return () => { requestVersion.current += 1; };
  }, [getFlaggedListings]));

  useEffect(() => {
    if (seenCompletionVersion.current === dismissals.completionVersion) return;
    seenCompletionVersion.current = dismissals.completionVersion;
    void getFlaggedListings();
  }, [dismissals.completionVersion, getFlaggedListings]);

  // Search function to filter listings by owner name or listing name
  const filterListings = (listings, query) => {
    if (!query || !listings) return listings;
    return listings.filter(
      listing =>
        listing.owner.name.toLowerCase().includes(query.toLowerCase()) ||
        listing.name.toLowerCase().includes(query.toLowerCase())
    );
  };

  if (!listingsData) {
    return (
      <AdminLoadingState message="Loading flagged listings..." />
    );
  }

  const visibleListings = listingsData.filter(
    listing => !moderationDismissals.isPending('listings', listing.listingID),
  );

  return (
    <View style={styles.container}>
      <AdminHeader title="Review Listings" onBack={() => router.replace('/AdminScreen')} backLabel="Back to admin" inset />

      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by owner name or listing name..."
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* FlatList for listings */}
      <FlatList
        data={filterListings(visibleListings, searchQuery) || []}
        ListEmptyComponent={
          <ModerationListState
            loading={listingsData === null && !loadError}
            error={loadError}
            searching={!!searchQuery}
            emptyText="No reported listings right now."
            onRetry={getFlaggedListings}
          />
        }
        keyExtractor={item => item.listingID.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={getFlaggedListings}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.listingBox}>
            {/* Listing Name */}
            <Text style={styles.listingName}>{item.name}</Text>

            {/* Type and Price */}
            <Text style={styles.typePrice}>
              {item.type} • ${item.price}/month
            </Text>

            {/* Address */}
            <Text style={styles.address}>{item.location}</Text>

            {/* Owner Image and Name */}
            <View style={styles.ownerContainer}>
              <ProfileImage
                uri={item.owner.photoURL}
                name={item.owner.name}
                style={styles.ownerImage}
                textStyle={styles.ownerImageInitials}
                screen="ReviewListingScreen"
                userId={item.owner.userID}
                role="owner"
              />
              <Text style={styles.ownerName}>{item.owner.name}</Text>
            </View>

            {/* Flag Icon */}
            <Image source={require('../assets/images/flag.png')} style={styles.flagIcon} />

            {/* Review Button */}
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => router.push(`/ReviewListingScreen2?listingid=${item.listingID}`)}
            >
              <Text style={styles.reviewButtonText}>Review</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F7F8FA',
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
    color: '#000', // Add text color
  },
  listingBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  listingName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  typePrice: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  ownerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ownerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  ownerImageInitials: {
    fontSize: 14,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  flagIcon: {
    width: 25,
    height: 25,
    position: 'absolute',
    top: 10,
    right: 10,
  },
  reviewButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 40,
    borderRadius: 5,
    alignSelf: 'center',
    marginTop: 10,
  },
  reviewButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ReviewListingsScreen;
