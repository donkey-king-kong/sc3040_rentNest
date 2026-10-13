import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { inboxStore } from '../config/inbox';
import { AdminHeader, AdminLoadingState } from '../components/AdminUI';
import ProfileImage from '../components/ProfileImage';
import { startOptimisticDismissal } from '../config/moderationDismissals';

const ReviewListingScreen2 = () => {
  const router = useRouter();
  const { listingid } = useLocalSearchParams();

  const [listingData, setListingData] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const deletePending = useRef(false);
  const dismissPending = useRef(false);

  const handleIgnore = async () => {
    if (dismissPending.current || deletePending.current) return;
    dismissPending.current = true;
    setIsDismissing(true);

    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        dismissPending.current = false;
        setIsDismissing(false);
        console.log('No token found!');
        router.replace('/LoginScreen');
        return;
      }

      console.log(`Executing PUT ${API_BASE_URL}/api/listings/setFlag/${listingid}/false`);
      const started = startOptimisticDismissal({
        type: 'listings',
        id: listingid,
        itemLabel: 'listing report',
        request: () => axios.put(`${API_BASE_URL}/api/listings/setFlag/${listingid}/false`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        }),
      });

      if (started) {
        router.back();
      } else {
        dismissPending.current = false;
        setIsDismissing(false);
      }
    } catch (error) {
      dismissPending.current = false;
      setIsDismissing(false);
      console.error("Failed to update listing flag:", error);
    }
  };

  const handleDelete = async () => {
    if (deletePending.current) return;
    deletePending.current = true;
    setDeleting(true);
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
        timeout: 15000,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });

      // Replace the deleted property's review page with the standard success notification.
      inboxStore.invalidate();
      router.replace('/ReviewListingScreen3');
    } catch (error) {
      const serverMessage = error.response?.data?.message;
      const message = typeof serverMessage === 'string' && serverMessage.trim()
        ? serverMessage
        : error.response
          ? "Couldn't delete this listing. Refresh and try again."
          : "Couldn't reach the server. Check your connection and try again.";
      Alert.alert('Unable to delete listing', message);
    } finally {
      deletePending.current = false;
      setDeleting(false);
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
          photoURL: response.data.ownerPhotoURL || null
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
      <AdminLoadingState message="Loading listing review..." />
    );
  }

  return (
    <View style={styles.container}>
      <AdminHeader title="Review Flagged Listing" onBack={() => router.replace('/ReviewListingScreen')} backLabel="Back to listings" inset />

      <View style={styles.listingBox}>
        {/* Flag Image at the top right corner */}
        <Image
          source={require('../assets/images/flag.png')} // Update the path to your flag.png file
          style={styles.flagImage}
        />

        <Text style={styles.listingName}>{listingData.name}</Text>
        <Text style={styles.address}>{listingData.location}</Text>

        <View style={styles.ownerContainer}>
          <ProfileImage
            uri={listingData.owner?.photoURL}
            name={listingData.owner?.name}
            style={styles.ownerImage}
            textStyle={styles.ownerImageInitials}
            screen="ReviewListingScreen2"
            userId={listingData.owner?.userID}
            role="owner"
          />
          <Text style={styles.ownerName}>{listingData.owner?.name}</Text>
        </View>

        <TouchableOpacity
          style={styles.viewFullListingButton}
          onPress={() => router.push({
            pathname: '/HomeListingScreen',
            params: { listingId: listingData.listingID },
          })}
        >
          <Text style={styles.buttonText}>View Full Listing</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.ignoreButton]}
          onPress={handleIgnore} // Call handleIgnore function
          disabled={deleting || isDismissing}
          accessibilityState={{ disabled: deleting || isDismissing, busy: isDismissing }}
        >
          <Text style={styles.buttonText}>{isDismissing ? 'Dismissing…' : 'Dismiss Report'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDelete} // Call handleDelete function
          disabled={deleting || isDismissing}
          accessibilityState={{ disabled: deleting || isDismissing, busy: deleting }}
        >
          <Text style={styles.buttonText}>{deleting ? 'Deleting…' : 'Delete Listing'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F7F8FA',
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
  ownerImageInitials: {
    fontSize: 14,
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
    justifyContent: 'center', // keeps both buttons even if a label wraps
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
