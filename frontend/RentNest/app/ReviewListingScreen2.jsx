import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native'; // Import useRoute for accessing route parameters
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const ReviewListingScreen2 = () => {
  const router = useRouter(); // Get the router object
  const route = useRoute(); // Get the route object
  const { listingid } = route.params; // Get listingID from route parameters

  const [listingData, setListingData] = useState(null);

  const handleIgnore = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('No token found!');
        router.replace('/LoginScreen');
        return;
      }

      console.log(`Executing PUT ${API_BASE_URL}/api/listings/setFlag/${listingid}/false`);
      await axios.put(`${API_BASE_URL}/api/listings/setFlag/${listingid}/false`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });

      // Go back and trigger refresh
      router.setParams({ refresh: 'true' });
      router.back();
    } catch (error) {
      console.error("Failed to update listing flag:", error);
    }
  };

  const handleDelete = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('No token found!');
        router.replace('/LoginScreen');
        return;
      }

      // First, delete the listing
      console.log(`Executing DELETE ${API_BASE_URL}/api/listings/${listingid}`);
      await axios.delete(`${API_BASE_URL}/api/listings/${listingid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });

      // Then navigate to ReviewListingScreen3
      router.push('/ReviewListingScreen3');
    } catch (error) {
      console.error("Failed to delete listing:", error);
    }
  };

  const getFlaggedListing = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('No token found!');
        router.replace('/LoginScreen');
        return;
      }

      console.log(`Executing GET ${API_BASE_URL}/api/listings/${listingid}`)
      const response = await axios.get(`${API_BASE_URL}/api/listings/${listingid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });
      console.log("Response:", response.data);

      // Transform single listing data
      const flaggedListing = {
        listingID: response.data.listingID || 0,
        name: response.data.name || 'Unnamed Listing',
        location: response.data.location || 'Location not specified',
        owner: {
          userID: response.data.ownerId || 0,
          name: response.data.ownerName || 'Unknown Owner',
          photoURL: response.data.ownerPhotoURL || "https://images.healthshots.com/healthshots/en/uploads/2020/12/08182549/positive-person.jpg"
        },
      };
      console.log("Transformed listing:", flaggedListing);

      setListingData(flaggedListing);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };

  useEffect(() => {
    if (listingid) {
      getFlaggedListing();
    }
  }, [listingid]);

  if (!listingData) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.listingBox}>
        {/* Flag Image at the top right corner */}
        <Image
          source={require('../assets/images/flag.png')} // Update the path to your flag.png file
          style={styles.flagImage}
        />

        <Text style={styles.listingName}>{listingData.name}</Text>
        <Text style={styles.address}>{listingData.location}</Text>

        <View style={styles.ownerContainer}>
          <Image 
            source={{ uri: listingData.owner?.photoURL }} 
            style={styles.ownerImage} 
          />
          <Text style={styles.ownerName}>{listingData.owner?.name}</Text>
        </View>

        <TouchableOpacity
          style={styles.viewFullListingButton}
          onPress={() => router.push(`/HomeListingScreen?listingid=${listingData.listingID}`)} // Navigate to Full Listing Screen
        >
          <Text style={styles.buttonText}>View Full Listing</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.ignoreButton]}
          onPress={handleIgnore} // Call handleIgnore function
        >
          <Text style={styles.buttonText}>Ignore</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDelete} // Call handleDelete function
        >
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  listingBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    elevation: 3,
    marginBottom: 20,
    position: 'relative', // Ensure that the flag image is positioned relative to this box
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  listingName: {
    fontSize: 18,
    fontWeight: 'bold',
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
  viewFullListingButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    width: '40%', // Adjust width as necessary
  },
  ignoreButton: {
    backgroundColor: 'green',
  },
  deleteButton: {
    backgroundColor: 'red',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  flagImage: {
    position: 'absolute', // Position the image absolutely
    top: 10, // Adjust to position it correctly
    right: 10, // Adjust to position it correctly
    width: 24, // Adjust size as necessary
    height: 24, // Adjust size as necessary
  },
});

export default ReviewListingScreen2;
