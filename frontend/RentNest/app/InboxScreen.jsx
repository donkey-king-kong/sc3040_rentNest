import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import NavigationBar from '../components/NavigationBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from "axios";
import { API_BASE_URL } from '../config/api';
import { jwtDecode } from "jwt-decode";

const InboxScreen = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [listings, setListings] = useState([]);
  
  const fetchListings = async () => {
    try {
      setIsLoading(true);

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.log("No token found!");
        router.replace("/LoginScreen");
        return;
      }

      // Get email from token
      const decoded = jwtDecode(token);
      const email = decoded.sub;
      console.log('[InboxScreen] Token decoded successfully, email:', email);

      // Get current user
      const userResponse = await axios.get(`${API_BASE_URL}/api/users/${email}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      console.log("Current User obtained:", userResponse.data);
      setCurrentUser(userResponse.data);

      // Get listings
      const listingsResponse = await axios.get(`${API_BASE_URL}/api/listings`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      setListings(listingsResponse.data);

      setIsLoading(false);
    } catch (error) {
      console.error("Error in fetchListings:", error);
      setIsLoading(false);
      if (error.response?.status === 401) {
        router.replace("/LoginScreen");
      }
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  // Filter listings for the current user
  const userListings = listings.filter(listing =>
    listing.ownerId === currentUser?.userID ||
    (listing.tenantId === currentUser?.userID)
    // || (listing.tenantId === null && listing.ownerId !== currentUser?.userID) // Include viewer listings
  );

  // Render each listing item
  const renderItem = ({ item }) => {
    const isOwner = item.ownerId === currentUser?.userID;
    const isTenant = item.tenantId === currentUser?.userID;

    let roleText;
    if (isOwner) {
      roleText = 'Owner';
    } else if (isTenant) {
      roleText = 'Tenant';
    } 
    // else if (item.tenantId === null) {
    //   roleText = 'Viewer'; // For listings without a tenant and where the owner is not the current user
    // }

    return (
      <TouchableOpacity
        style={styles.listingContainer}
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
          // else if (item.tenantId === null) {
          //   router.push({
          //     pathname: '/RentalInfoViewerScreen',
          //     params: { listingId: item.listingID },
          //   });
          // }
        }}
      >
        <Image source={{ uri: item.listingpicture }} style={styles.image} />
        <View style={styles.detailsContainer}>
          <View style={styles.roleBox}>
            <Text style={styles.roleText}>{roleText}</Text>
          </View>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.address}>{item.location}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.loadingContainer]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.header}>Inbox</Text>
        <FlatList
          data={userListings}
          renderItem={renderItem}
          keyExtractor={(item) => item.listingID.toString()}
        />
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
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
