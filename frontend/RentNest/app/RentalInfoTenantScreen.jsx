import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import chatIcon from "../assets/images/chaticon.jpg";
import { FontAwesome } from '@expo/vector-icons';
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { useLocalSearchParams } from "expo-router";


const RentalInfoTenant = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { listingId, tenantId } = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const { refresh } = useLocalSearchParams();
  const [listing, setListing] = useState(null); // State to store listing data
  const [rentals, setRentals] = useState(null); // State to store rentals data
  const [loading, setLoading] = useState(true); // Track loading state

  // Fetch listing details
  const getListingID = async () => {
    try {
      setLoading(true); // Start loading
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found!');
        navigation.replace('/LoginScreen');
        return;
      }
      console.log(`This is the listing ID: ${listingId}`);
      const response = await axios.get(`${API_BASE_URL}/api/listings/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      console.log("Listings response", response.status, response.data);
      setListing(response.data);
    } catch (error) {
      console.error('Error fetching listing:', error);
    } finally {
      setLoading(false); // Stop loading after the request completes
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getRentalsID = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found!');
        navigation.replace('/LoginScreen');
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/api/payment/tenant-payments/${listingId}/${tenantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      console.log("Rentals response", response.data);
      setRentals(response.data); // Store the fetched data in state
    } catch (error) {
      console.error('Error fetching rental information:', error);
    }
  };

  // Refresh function
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await getListingID();
    await getRentalsID();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    getListingID();
    getRentalsID();
  }, [refresh]);

  // Function to navigate to RentPayment screen
  const handleRentPayment = () => {
    if (listing && listing.listingID) {
      navigation.navigate('RentPayment', { listingId: listing.listingID, tenantId: tenantId });
    } else {
      console.error('Listing ID is missing, cannot navigate to RentPayment');
    }
  };

  // Function to navigate to LeaveReview screen
  const handleLeaveReview = () => {
    if (listing && listing.ownerId) {
      console.log('Attempting to navigate with:', { ownerId: listing.ownerId, listingId, tenantId });
      navigation.navigate('LeaveReview', {
        ownerId: listing.ownerId,  // Pass the correct owner ID
        listingId: listingId,      // Pass the listing ID
        tenantId: tenantId,        // Pass tenant ID as well
      });
    } else {
      console.error('Listing information is missing, cannot navigate to LeaveReview');
    }
  };

  return (
      <ScrollView style={styles.container}>
        <View style={styles.row}>
          <Text style={styles.title}>Rental Info</Text>
          {/* Chat Button */}
          <TouchableOpacity
              style={styles.transparentButton}
              onPress={() => {
                navigation.navigate('ChatsScreen2', {partnerUserId: listing.ownerId, currentUser: listing.tenantId});
              }}
          >
            <Image source={chatIcon} style={[styles.icon, styles.lighterIcon]} />
          </TouchableOpacity>
        </View>

        {listing ? (
            <>
              <Image source={{ uri: listing.listingpicture }} style={styles.image} />

              <View style={styles.row}>
                <View style={styles.left}>
                  <Text style={styles.listingName}>{listing.name}</Text>
                  <Text style={styles.listingAddress}>{listing.location}</Text>
                </View>
                <View style={styles.ownerBox}>
                  <Text style={styles.ownerText}>Tenant</Text>
                </View>
              </View>

              {/* Thin divider */}
              <View style={styles.thinDivider} />

              {/* Lease and rent details */}
              <View style={styles.detailsRow}>
                <View>
                  <Text style={styles.detailsLabel}>Lease until:</Text>
                  <Text style={styles.detailsValue}>{rentals ? formatDate(rentals.leaseExpiry) : 'Loading...'}</Text>
                </View>
                <View style={styles.rightAligned}>
                  <Text style={styles.detailsLabel}>Monthly Rental Payment:</Text>
                  <Text style={styles.detailsValue}>S${listing.price}</Text>
                </View>
              </View>

              {/* Thick divider container */}
              <View style={styles.thickDividerContainer}>
                <View style={styles.fullWidthDivider} />
              </View>

              {/* Rental Payment and Leave Review Buttons */}
              <TouchableOpacity style={styles.transparentButton} onPress={handleRentPayment}>
                <FontAwesome name="money" size={24} color="#666" style={styles.icon} />
                <Text style={styles.buttonText}>Rent Payment</Text>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>

              {loading ? (
                  <Text>Loading listing information...</Text>
              ) : (
                  listing ? (
                      <TouchableOpacity style={styles.transparentButton} onPress={handleLeaveReview}>
                        <FontAwesome name="star" size={24} color="#666" style={styles.icon} />
                        <Text style={styles.buttonText}>Leave Review</Text>
                        <Text style={styles.arrow}>›</Text>
                      </TouchableOpacity>
                  ) : (
                      <Text>Error loading listing data</Text>
                  )
              )}
            </>
        ) : (
            <Text>Loading...</Text>
        )}
      </ScrollView>
  );}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'left',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  left: {
    flexDirection: 'column',
  },
  listingName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  listingAddress: {
    fontSize: 16,
    color: '#666',
  },
  ownerBox: {
    backgroundColor: 'black',
    padding: 5,
    borderRadius: 5,
  },
  ownerText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  detailsLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  detailsValue: {
    fontSize: 14,
    color: '#666',
  },
  rightAligned: {
    alignItems: 'flex-end',
  },
  thinDivider: {
    height: 1,
    backgroundColor: '#ddd',
    width: '100%',
    marginVertical: 10,
  },
  thickDividerContainer: {
    position: 'relative',
    width: '100%',
    marginVertical: 15,
  },
  fullWidthDivider: {
    height: 10,
    backgroundColor: '#EAEAEA',
    position: 'absolute',
    left: -0,
    right: 0,
    top: 0,
    marginLeft: -20,
    marginRight: -20,
  },
  transparentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  buttonText: {
    flex: 1,
    fontSize: 16,
  },
  arrow: {
    fontSize: 18,
    color: '#ccc',
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
});

export default RentalInfoTenant;
