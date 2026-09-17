import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const ReviewListingsScreen = () => {
  const [listingsData, setListingsData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { refresh } = useLocalSearchParams();

  const getFlaggedListings = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
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
            photoURL: listing.ownerPhotoURL || "https://images.healthshots.com/healthshots/en/uploads/2020/12/08182549/positive-person.jpg"
          },
          type: listing.type,
          description: listing.description
        };
      }));
      setListingsData(listingsWithOwners);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await getFlaggedListings();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    getFlaggedListings();
  }, [refresh]); // Refresh when the refresh parameter changes

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
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Review Listings</Text>

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
        data={filterListings(listingsData, searchQuery)}
        keyExtractor={item => item.listingID.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
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
              <Image 
                source={{ uri: item.owner.photoURL }} 
                style={styles.ownerImage} 
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
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
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
