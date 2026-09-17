import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const BanUsersScreen2 = () => {
  const router = useRouter();
  const route = useRoute();
  const { userid } = route.params || {};

  const [flaggedUser, setFlaggedUser] = useState(null);

  const getFlaggedUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('No token found!');
        router.replace('/LoginScreen');
        return;
      }

      console.log(`Executing GET ${API_BASE_URL}/api/users/id/${userid}`)
      const response = await axios.get(`${API_BASE_URL}/api/users/id/${userid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });
      console.log("Response :", response.data)


      // Transform single user data
      const transformedData = {
        userID: response.data.userid,
        name: response.data.name,
        email: response.data.email,
        flagged: response.data.flagged,
        photoURL: response.data.photoURL || "https://images.healthshots.com/healthshots/en/uploads/2020/12/08182549/positive-person.jpg"
      };
      console.log(transformedData);

      setFlaggedUser(transformedData);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };

  const handleBanUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('No token found!');
        router.replace('/LoginScreen');
        return;
      }

      console.log(`Executing PUT ${API_BASE_URL}/api/users/setFlag/${userid}/2`);
      await axios.put(`${API_BASE_URL}/api/users/setFlag/${userid}/2`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });

      // Navigate to ban user screen 3
      router.push('/BanUserScreen3');
    } catch (error) {
      console.error("Failed to ban user:", error);
    }
  };

  const handleIgnoreUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('No token found!');
        router.replace('/LoginScreen');
        return;
      }

      console.log(`Executing PUT ${API_BASE_URL}/api/users/setFlag/${userid}/0`);
      await axios.put(`${API_BASE_URL}/api/users/setFlag/${userid}/0`, {}, {
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
      console.error("Failed to ignore user:", error);
    }
  };

  useEffect(() => {
    if (userid) {
      getFlaggedUser();
    }
  }, [userid]);

  if (!flaggedUser) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.userBox}>
        <View style={styles.header}>
          <Image source={{ uri: flaggedUser.photoURL }} style={styles.userImage} />
          <Text style={styles.userName}>{flaggedUser.name}</Text>
        </View>
        <Text style={styles.email}>Email: {flaggedUser.email}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.ignoreButton]}
          onPress={handleIgnoreUser}
        >
          <Text style={styles.buttonText}>Ignore</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleBanUser}
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
  userBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 14,
    marginTop: 5,
  },
  contact: {
    fontSize: 14,
    marginTop: 5,
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
});

export default BanUsersScreen2;
