import React, {useEffect, useState} from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import {API_BASE_URL} from "../config/api";

const RentalInfoOwner = () => {
  const router = useRouter();
  const { listingId, refresh } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [listing, setListing] = useState(null); // State to store listing data

  // Fetch listing details
  const getListingID = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found!');
        router.replace('/LoginScreen');
        return;
      }
      console.log("Trying endpoint : GET",`${API_BASE_URL}/api/listings/${listingId}`);
      const response = await axios.get(`${API_BASE_URL}/api/listings/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });
      console.log("Listings response", response.data);
      
      // Add dummy data if tenantId is null
      const listingData = response.data;
      if (!listingData.tenantId) {
        listingData.tenantId = 0;
        listingData.tenantName = 'No Tenant yet...';
        listingData.tenantPhotoURL = 'https://media.istockphoto.com/id/1495088043/vector/user-profile-icon-avatar-or-person-icon-profile-picture-portrait-symbol-default-portrait.jpg?s=612x612&w=0&k=20&c=dhV2p1JwmloBTOaGAtaA3AW1KSnjsdMt7-U_3EZElZ0=';
      }
      
      setListing(listingData); // Store the fetched data with dummy values if needed

    } catch (error) {
      console.error('Error fetching listing:', error);
    }
  };

  // Refresh function
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await getListingID();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    getListingID();
  }, [refresh]);

  const handleTenantPress = (tenantId, listingId) => {
    router.push({pathname: '/TenantOverview', params: { tenantId, listingId }});
  };

  const handleShowRentalListing = () => {
    if (listing) {
      router.push({pathname: '/HomeListingScreen', params: { listingId: listing.listingID }});
    }
  };

  return (
      <ScrollView style={styles.container}>
        <View style={styles.titleRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome name="chevron-left" size={18} color="#101820" />
          </TouchableOpacity>
          <Text style={styles.title}>Rental Info</Text>
        </View>

        {/* Image */}
        {listing && (
            <>
              <Image source={{ uri: listing.listingpicture }} style={styles.image} />

              {/* Listing name and address */}
              <View style={styles.row}>
                <View style={styles.left}>
                  <Text style={styles.listingName}>{listing.name}</Text>
                  <Text style={styles.listingAddress}>{listing.location}</Text>
                </View>
                <View style={styles.ownerBox}>
                  <Text style={styles.ownerText}>Owner</Text>
                </View>
              </View>

              {/* Owner details */}
              <View style={styles.row}>
                <Image source={{ uri: listing.ownerPhotoURL }} style={styles.ownerPhoto} />
                <Text style={styles.ownerName}>{listing.ownerName}</Text>
              </View>

              {/* Thin divider */}
              <View style={styles.thinDivider} />

              {/* Tenant and rent details */}
              <View style={styles.detailsRow}>
                <View>
                  <Text style={styles.detailsLabel}>Current Tenants:</Text>
                  <Text style={styles.detailsValue}>{listing.tenantId === 0 ? 'No current tenant' : listing.tenantName}</Text>
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

              {/* Manage Tenants */}
              <Text style={styles.sectionTitle}>Manage Tenant</Text>
              {listing.tenantId !== 0 ? (
                <TouchableOpacity
                    style={styles.transparentButton}
                    onPress={() => handleTenantPress(listing.tenantId, listing.listingID)}
                >
                  <Image source={{ uri: listing.tenantPhotoURL }} style={styles.tenantPhoto} />
                  <Text style={styles.buttonText}>{listing.tenantName}</Text>
                  <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.transparentButton}>
                  <Image source={{ uri: listing.tenantPhotoURL }} style={styles.tenantPhoto} />
                  <Text style={[styles.buttonText, { color: '#999' }]}>No current tenant</Text>
                </View>
              )}

              {/* Page break with another thick line */}
              <View style={styles.thickDividerContainer}>
                <View style={styles.fullWidthDivider} />
              </View>

              {/* Rental Listing and Edit Listing Buttons with FontAwesome Icons */}
              <TouchableOpacity style={styles.transparentButton} onPress={() => handleShowRentalListing()}>
                <FontAwesome name="list-alt" style={[styles.icon, styles.lighterIcon]} />
                <Text style={styles.buttonText}>Show Rental Listing</Text>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                  style={styles.transparentButton}
                  onPress={() => router.push({pathname: '/EditListingScreen', params: { listingId }})}
              >
                <FontAwesome name="edit" style={[styles.icon, styles.lighterIcon]} />
                <Text style={styles.buttonText}>Edit Listing</Text>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            </>
        )}
      </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20, // Padding for entire container
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
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
  ownerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
    marginVertical: 10, // Keep margin around thin dividers
  },
  thickDividerContainer: {
    position: 'relative',
    width: '100%',
    marginVertical: 15, // Margin for spacing around the thick divider
  },
  fullWidthDivider: {
    height: 10,
    backgroundColor: '#EAEAEA',
    position: 'absolute',
    left: -0,
    right: 0,
    top: 0,
    marginLeft: -20, // Adjust based on the padding of the container
    marginRight: -20, // Adjust based on the padding of the container
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  transparentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tenantPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
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
    fontSize: 24, // Adjust the size of the FontAwesome icons as needed
    marginRight: 10, // Space between icon and text
  },
  lighterIcon: {
    opacity: 0.6, // Adjust the opacity for lighter appearance
  },
});

export default RentalInfoOwner;
