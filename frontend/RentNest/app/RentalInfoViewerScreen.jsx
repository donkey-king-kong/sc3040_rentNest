import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { useLocalSearchParams } from "expo-router";

const RentalInfoViewer = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { listingId } = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const { refresh } = useLocalSearchParams();
  const [listing, setListing] = useState(null); // State to store listing data

  // Fetch listing details
  const getListingID = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found!');
        navigation.replace('/LoginScreen');
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/api/listings/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });
      console.log("Listings response", response.data);
      setListing(response.data); // Store the fetched data in state

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

  // Navigate to HomeListingScreen
  const handleShowRentalListing = () => {
    if (listing) {
      navigation.navigate('HomeListingScreen', { listingId: listing.listingID });
    }
  };

  return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Rental Info</Text>

        {listing ? (
            <>
              <Image source={{ uri: listing.listingpicture }} style={styles.image} />

              <View style={styles.row}>
                <View style={styles.left}>
                  <Text style={styles.listingName}>{listing.name}</Text>
                  <Text style={styles.listingAddress}>{listing.location}</Text>
                </View>
                <View style={styles.ownerBox}>
                  <Text style={styles.ownerText}>Viewer</Text>
                </View>
              </View>

              <View style={styles.thickDividerContainer}>
                <View style={styles.fullWidthDivider} />
              </View>

              <TouchableOpacity style={styles.transparentButton} onPress={handleShowRentalListing}>
                <FontAwesome name="home" size={24} color="#222222" style={styles.icon} />
                <Text style={styles.buttonText}>Show Rental Listing</Text>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>

              <View style={styles.grayOutline} />
            </>
        ) : (
            <Text>Loading...</Text>
        )}
      </ScrollView>
  );
};

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
  thickDividerContainer: {
    width: '100%',
    marginVertical: 15,
  },
  fullWidthDivider: {
    height: 10,
    backgroundColor: '#EAEAEA',
  },
  transparentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'transparent',
    borderRadius: 5,
    marginTop: 0,
  },
  buttonText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  arrow: {
    fontSize: 18,
    color: '#222222',
  },
  icon: {
    marginRight: 10,
  },
  grayOutline: {
    height: 2,
    backgroundColor: '#D3D3D3',
    marginTop: 10,
    width: '100%',
  },
});

export default RentalInfoViewer;